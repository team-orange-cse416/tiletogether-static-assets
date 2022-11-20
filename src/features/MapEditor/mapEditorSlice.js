import _ from 'lodash';
import { createAsyncThunk, createSlice, isFulfilled, isPending, isRejected } from '@reduxjs/toolkit';
import { apiClient } from '../../app/apiClient';
import { getActionName } from '../../utils/stringUtils';
import ObjectID from 'bson-objectid';
import { getFirstAndLastGuids } from '../../utils/mapUtils';
import { jszip } from '../../utils/fileUtils';
import { saveAs } from 'file-saver';
import { create } from 'xmlbuilder2';

export function getCurrentGuids ({ firstGuids, file, tilesetCanvases }) {
  return file.tilesets.map(tileset => [firstGuids[tileset.file], firstGuids[tileset.file] + tilesetCanvases[tileset.file].width / file.tileDimension * tilesetCanvases[tileset.file].height / file.tileDimension - 1]);
}

const initialState = {
  file: null,
  primitives: {
    // draw, erase, select
    activeTool: 'draw',
    dragStart: null,
    dragging: false,
    lastSelectedLayer: null,
    brushTileset: null,
    brushTileIndices: null,
  },
  layerData: {},
  tilesetCanvases: {},
  firstGuids: {},
  layerTiles: {},
  brushCanvas: null,
  newChanges: {},
  statuses: {},
  errors: {},
};

export const asyncGetFileToEdit = createAsyncThunk(
  'mapEditor/getFileToEdit',
  async ({ id }) => {
    const response = await apiClient.get(`/files/${id}/edit`);
    let { file, signedUrls } = response.data;

    file.rootLayer.isRootLayer = true;
    // use cloneDeepWith to set all layers selected and expanded to false
    function customizer (layer) {
      if (_.get(layer, '_id')) {
        if (layer.isRootLayer) {
          _.assign(layer, { selected: false, expanded: true });
        } else if (['layer', 'tileset'].includes(layer.type)) {
          _.assign(layer, { selected: false, expanded: false });
        }
      }
    }
    file.rootLayer.isRootLayer = true;
    file = _.cloneDeepWith(file, customizer);
    const tilesetCanvases = {};

    async function loadImages () {
      // console.log('signedUrls', signedUrls);

      for (const tileset of file.tilesets) {
        const image = new window.Image();
        image.src = signedUrls[tileset.file];
        image.crossOrigin = 'Anonymous';
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        tilesetCanvases[tileset.file] = canvas;
      }
    }
    await loadImages();

    return { file, tilesetCanvases };
  },
);

export const asyncPatchFile = createAsyncThunk(
  'mapEditor/patchFile',
  async ({ id, updates }, { rejectWithValue, getState }) => {
    const { file } = getState().mapEditor;

    const newTilesetCanvases = {};

    try {
      const response = await apiClient.patch(`/files/${id}`, updates);

      // determine new tilesets
      // console.log('file.tilesets', file.tilesets);
      // console.log('data.file.tilesets', response.data.file.tilesets);
      const newTilesets = _.differenceBy(response.data.file.tilesets, file.tilesets, 'file');
      // console.log('newTilesets', newTilesets);

      // get canvases
      for (const tileset of newTilesets) {
        const image = new window.Image();
        image.src = tileset.imageUrl;
        image.crossOrigin = 'Anonymous';
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        newTilesetCanvases[tileset.file] = canvas;
      }

      return { newFile: response.data.file, newTilesetCanvases };
    } catch (err) {
      return rejectWithValue(err.response.data.error);
    }
  },
);

export const asyncDeleteFile = createAsyncThunk(
  'mapEditor/deleteFile',
  async ({ id }) => {
    const response = await apiClient.delete(`/files/${id}`);
    return response.data.file;
  },
);

const mapEditorSlice = createSlice({
  name: 'mapEditor',
  initialState,
  reducers: {
    setBrushCanvas (state, action) {
      state.brushCanvas = action.payload;
    },
    updateLayerTiles (state, action) {
      const { layerId, tiles } = action.payload;
      state.layerTiles[layerId] = tiles;
    },
    assignLayerTiles (state, action) {
      state.layerTiles = action.payload;
    },
    setMapEditorPrimitives (state, action) {
      state.primitives = _.merge(state.primitives, action.payload);
    },
    assignMapEditorPrimitives (state, action) {
      state.primitives = _.assign(state.primitives, action.payload);
    },
    addNewMapLayer (state) {
      // TODO: add new layer at appropriate position; for now just add to start of rootLayer's layers
      let highestNumber = 0;
      function getHighestNumber (layer) {
        if (!layer) return;
        if (layer.name.startsWith('Layer ')) {
          const number = parseInt(layer.name.split(' ')[1]);
          if (number > highestNumber) highestNumber = number;
        }
        if (layer.layers) {
          layer.layers.forEach(layer => getHighestNumber(layer));
        }
      }
      getHighestNumber(state.file.rootLayer);

      const newLayer = {
        _id: ObjectID().toHexString(),
        name: `Layer ${highestNumber + 1}`,
        type: 'layer',
        selected: true,
        opacity: 1,
        layers: [],
      };

      state.file.rootLayer.layers.unshift(newLayer);

      // clear all selections except new layer
      function customizer2 (layer) {
        if (_.get(layer, '_id') && layer._id !== newLayer._id) {
          _.assign(layer, { selected: false });
        }
      }
      state.file.rootLayer = _.cloneDeepWith(state.file.rootLayer, customizer2);
      state.primitives.lastSelectedLayer = newLayer;

      setTimeout(() => {
        const layerDiv = document.getElementById(`explorer-${newLayer._id}`);
        if (layerDiv) {
          layerDiv.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
        }
      }, 100);
    },
    updateLayer: (state, action) => {
      const { newLayer } = action.payload;

      // use cloneDeepWith to avoid mutating state
      function customizer (value) {
        // if layer's _id matches newLayer's _id, return newLayer
        if (_.get(value, '_id') === _.get(newLayer, '_id')) {
          return newLayer;
        }
      }

      state.file.rootLayer = _.cloneDeepWith(state.file.rootLayer, customizer);
    },
    updateAllLayers: (state, action) => {
      // action.payload is an object of key-value pairs where the key is an attribute name and the value is the new value for that attribute
      const newAttributes = action.payload;

      // use cloneDeepWith to avoid mutating state
      function customizer (layer) {
        // if layer has an _id, update its attributes
        if (_.get(layer, '_id')) {
          _.assign(layer, newAttributes);
        }
      }

      if (!state.file || !state.file.rootLayer) return;

      state.file.rootLayer = _.cloneDeepWith(state.file.rootLayer, customizer);
    },
    updateAllLayersBetween: (state, action) => {
      const { startLayer, endLayer, newAttributes } = action.payload;

      const selectedLayers = [];
      let done = false;

      // traverse from start layer to end layer, adding each layer to selectedLayers
      function traverse (layer) {
        if (done) return;

        if (layer._id === startLayer._id || layer._id === endLayer._id) {
          selectedLayers.push(layer._id);
        } else if (selectedLayers.length > 0) {
          selectedLayers.push(layer._id);
        }

        if (layer._id !== selectedLayers[0] && (layer._id === endLayer._id || layer._id === startLayer._id)) {
          done = true;
          return;
        }

        if (layer.type === 'group' && layer.layers.length > 0) {
          layer.layers.forEach(traverse);
        }
      }

      traverse(state.file.rootLayer);

      // console.log('selectedLayers', selectedLayers);

      // use cloneDeepWith to avoid mutating state
      function customizer (layer) {
        // if layer has an _id, update its attributes
        if (_.get(layer, '_id') && selectedLayers.includes(layer._id)) {
          // console.log('layer', _.cloneDeep(layer));
          _.assign(layer, newAttributes);
        }
      }

      state.file.rootLayer = _.cloneDeepWith(state.file.rootLayer, customizer);
    },
    updateLayerAndItsChildren: (state, action) => {
      const { newLayer, newAttributes } = action.payload;

      // traverse layer and its children, updating attributes
      function traverse (layer) {
        _.assign(layer, newAttributes);

        if (layer.type === 'group' && layer.layers.length > 0) {
          layer.layers.forEach(traverse);
        }
      }
      traverse(newLayer);

      // use cloneDeepWith to avoid mutating state
      function customizer (layer) {
        // if layer's _id matches layer's _id, return layer
        if (_.get(layer, '_id') === _.get(newLayer, '_id')) {
          return newLayer;
        }
      }
      state.file.rootLayer = _.cloneDeepWith(state.file.rootLayer, customizer);
    },
    moveSelectedLayers: (state, action) => {
      const { moveToLayer } = action.payload;
      const selectedLayers = [];

      let invalid = false;

      // traverse from rootLayer, if a layer is selected, add it to selectedLayers, remove it from its parent layer, and don't recurse into it, continue until all layers have been traversed
      function traverse1 (layer) {
        if (invalid) return;

        // get all selected layers
        const selectedLayer = _.filter(layer.layers, { selected: true });
        if (selectedLayer.length > 0) {
          // check if moveToLayer is selectedLayer or a child of selectedLayer, if so, return
          if (moveToLayer._id === selectedLayer[0]._id) {
            invalid = true;
            return;
          } else {
            function traverse2 (layer) {
              if (layer._id === moveToLayer._id) {
                invalid = true;
              } else if (layer.type === 'group' && layer.layers.length > 0) {
                layer.layers.forEach(traverse2);
              }
            }
            traverse2(selectedLayer[0]);
          }

          selectedLayers.push(...selectedLayer);
        } else {
          // if layer is a group, recurse into it
          if (layer.type === 'group' && layer.layers.length > 0) {
            layer.layers.forEach(traverse1);
          }
        }
      }
      traverse1(state.file.rootLayer);

      if (invalid) return;

      let moved = false;
      // console.log(`selectedLayers: ${JSON.stringify(selectedLayers)}`);

      // cloneDeep while excluding selected layers
      function traverse2 (layer) {
        if (layer.type === 'group') {
          layer.layers = _.filter(layer.layers, (layer) => !selectedLayers.includes(layer));

          if (!moved) {
            // if moveToLayer is a layer, insert selectedLayers after it
            if (layer.layers.some((layer) => layer._id === moveToLayer._id && layer.type === 'layer')) {
              const index = _.findIndex(layer.layers, { _id: moveToLayer._id });
              // console.log(`${layer.name} contains ${moveToLayer.name}, moving after ${moveToLayer.name}`);
              layer.layers = [...layer.layers.slice(0, index + 1), ...selectedLayers, ...layer.layers.slice(index + 1)];
              moved = true;
              // else if moveToLayer is a group, insert selectedLayers at beginning of group's layers
            } else if (layer._id === moveToLayer._id && layer.type === 'group') {
              // console.log(`Moving to start of ${moveToLayer.name}'s layers`);
              layer.layers = [...selectedLayers, ...layer.layers];
            }
          }

          layer.layers.forEach(traverse2);
        }
      }
      traverse2(state.file.rootLayer);

      selectedLayers.forEach((layer) => {
        if (state.newChanges[layer._id]) {
          state.newChanges[layer._id].deleted = true;
        } else {
          state.newChanges[layer._id] = { deleted: true };
        }
      });
    },
    updateLayersUpToRoot: (state, action) => {
      const { fromLayer, newAttributes } = action.payload;

      // create function to traverse from root layer to fromFayer, once path to layer is found, recurse back up while updating each layer's value until root layer is reached
      function traverse (layer) {
        if (layer._id === fromLayer._id) {
          return layer;
        } else if (layer.type === 'group' && layer.layers.length > 0) {
          for (let i = 0; i < layer.layers.length; i++) {
            const result = traverse(layer.layers[i]);
            if (result) {
              _.assign(layer, newAttributes);
              return result;
            }
          }
        }
      }

      traverse(state.file.rootLayer);
    },
    deleteSelectedLayers: (state) => {
      // get selected layers
      const selectedLayers = [];
      function customizer (layer) {
        if (layer.selected) {
          selectedLayers.push(layer);
          if (state.newChanges[layer._id]) {
            state.newChanges[layer._id].deleted = true;
          } else {
            state.newChanges[layer._id] = { deleted: true };
          }
        }
      }
      _.cloneDeepWith(state.file.rootLayer, customizer);

      // if selectedLayers includes lastSelectedLayer, set lastSelectedLayer to null
      if (selectedLayers.some(layer => layer._id === state.primitives.lastSelectedLayer._id)) {
        state.primitives.lastSelectedLayer = null;
      }

      // use cloneDeepWith to avoid mutating state
      function traverse (layer) {
        // if a group's layers is in selectedLayers, filter it out
        if (layer.type === 'group') {
          selectedLayers.forEach(selectedLayer => {
            layer.layers = layer.layers.filter(layer => layer._id !== selectedLayer._id);
          });

          traverse(layer.layers);
        }
      }

      state.file.rootLayer = _.cloneDeepWith(state.file.rootLayer, traverse);
    },
    clearMapEditorErrors: state => {
      state.errors = {};
    },
    clearMapEditorStatus: (state, action) => {
      const { status } = action.payload;
      state.statuses[status] = null;
    },
    setLayerData: (state, action) => {
      state.layerData = action.payload;
    },
    eraseTileInLayer: (state, action) => {
      let { layerId, y, x } = action.payload;
      const canvas = state.layerData[layerId].canvas;
      const ctx = canvas.getContext('2d');
      const tileDimension = state.file.tileDimension;
      y *= tileDimension;
      x *= tileDimension;
      console.log(`erasing tile at ${x}, ${y} with tileDimension ${tileDimension}`);
      ctx.clearRect(x, y, tileDimension, tileDimension);
      const newLayerData = { ...state.layerData };
      newLayerData[layerId].canvas = canvas;
      state.layerData = newLayerData;
    },
    assignTilesetCanvases: (state, action) => {
      state.tilesetCanvases = action.payload;
    },
    assignFirstGuids: (state, action) => {
      state.firstGuids = action.payload;
    },
    downloadMapAsTmx: (state) => {
      console.log('downloading map as tmx');
      jszip.file('Hello.txt', 'Hello World\n');

      const tilesetCanvasesFolder = jszip.folder('tilesets');
      const metadataFolder = jszip.folder('metadata');
      state.file.tilesets.forEach(tileset => {
        const tilesetCanvas = state.tilesetCanvases[tileset.file];
        tilesetCanvasesFolder.file(`${tileset.name}.png`, tilesetCanvas.toDataURL().split(',')[1], { base64: true });
        const file = state.file;
        const tileDimension = file.tileDimension;
        const tileCount = tilesetCanvas.width / tileDimension * tilesetCanvas.height / tileDimension;

        const xml = create({ version: '1.0', encoding: 'UTF-8' })
          .ele('tileset', {
            version: '1.9',
            tiledversion: '1.9.1',
            name: tileset.name,
            tilewidth: tileDimension,
            tileheight: tileDimension,
            tilecount: tileCount,
            columns: tilesetCanvas.width / tileDimension,
          })
          .ele('image', {
            source: `../tilesets/${tileset.name}.png`,
            width: tilesetCanvas.width,
            height: tilesetCanvas.height,
          })
          .end({ prettyPrint: true });
        metadataFolder.file(`${tileset.name}.tsx`, xml);
      });

      async function download (name) {
        const content = await jszip.generateAsync({ type: 'blob' });
        saveAs(content, `${name}.zip`);
      }
      download(state.file.name);
    },
  },
  extraReducers (builder) {
    builder
      .addCase(asyncGetFileToEdit.pending, (state) => {
        state.file = null;
      })
      .addCase(asyncGetFileToEdit.fulfilled, (state, action) => {
        const { file, tilesetCanvases } = action.payload;
        // console.log('file', file);

        // also calculate firstGid for each tileset
        const newFirstGids = {};
        let firstGid = 1;
        for (const tileset of file.tilesets) {
          newFirstGids[tileset.file] = firstGid;
          const tileCount = tilesetCanvases[tileset.file].width / file.tileDimension * tilesetCanvases[tileset.file].height / file.tileDimension;
          firstGid += tileCount;
        }
        const nameToGid = {};
        for (const tileset of file.tilesets) {
          nameToGid[tileset.name] = newFirstGids[tileset.file];
        }
        console.log('nameToGid', nameToGid);
        state.firstGuids = newFirstGids;

        state.file = file;
        state.tilesetCanvases = tilesetCanvases;
      })
      .addCase(asyncPatchFile.fulfilled, (state, action) => {
        const { newFile, newTilesetCanvases } = action.payload;

        // create array of first guids, last guids for tiles in order
        // const currentGids = state.file.tilesets.map(tileset => [state.firstGuids[tileset.file], state.firstGuids[tileset.file] + state.tilesetCanvases[tileset.file].width / state.file.tileDimension * state.tilesetCanvases[tileset.file].height / state.file.tileDimension - 1]);

        if (Object.keys(newTilesetCanvases).length > 0) {
          // also calculate firstGid for each tileset
          // do this by finding first Gid with enough space for new tileset
          for (const tilesetFileId of Object.keys(newTilesetCanvases)) {
            const currentGuids = getCurrentGuids({ firstGuids: state.firstGuids, file: state.file, tilesetCanvases: state.tilesetCanvases });
            console.log('currentGuids', currentGuids);

            // find first Gid with enough space for new tileset
            // console.log('tileset', tilesetFileId);
            // console.log('newTilesetCanvases', newTilesetCanvases);
            // console.log('newTilesetCanvases[tileset.file]', newTilesetCanvases[tilesetFileId]);
            const canvas = newTilesetCanvases[tilesetFileId];
            // console.log('width', canvas.width);
            // console.log('height', canvas.height);
            const tileDimension = newFile.tileDimension;
            const tileCount = canvas.width / tileDimension * canvas.height / tileDimension;
            console.log('tileCount', tileCount);

            const newGuidPair = getFirstAndLastGuids(currentGuids, tileCount);
            console.log('newFirstGuid', newGuidPair);

            // currentGuids: [[1, 15], [16, 99], [100, 179]]

            state.firstGuids[tilesetFileId] = newGuidPair[0];
            console.log('state.firstGuids', _.cloneDeep(state.firstGuids));
          }
          // let firstGid = 1;
          // for (const tileset of newFile.tilesets) {
          //   newFirstGids[tileset.file] = firstGid;
          //   const tileCount = newTilesetCanvases[tileset.file].width / newFile.tileDimension * newTilesetCanvases[tileset.file].height / newFile.tileDimension;
          //   firstGid += tileCount;
          // }
        }

        const fieldsToUpdate = Object.keys(action.meta.arg.updates);
        const pickedFile = _.pick(newFile, fieldsToUpdate);
        // console.log('pickedFile', pickedFile);
        _.merge(state.file, pickedFile);
        // replace the sharedWith field
        state.file.sharedWith = newFile.sharedWith;

        // replace the tilesets field
        state.file.tilesets = newFile.tilesets;
        state.tilesetCanvases = _.merge(state.tilesetCanvases, newTilesetCanvases);
      })
      .addMatcher(isPending, (state, action) => {
        state.errors = {};
        state.statuses[getActionName(action)] = 'pending';
      })
      .addMatcher(isFulfilled, (state, action) => {
        state.errors = {};
        state.statuses[getActionName(action)] = 'fulfilled';
      })
      .addMatcher(isRejected, (state, action) => {
        state.statuses[getActionName(action)] = 'rejected';
        state.errors = action.payload;
      });
  },
});

export const {
  setMapEditorPrimitives,
  assignMapEditorPrimitives,
  clearMapEditorErrors,
  clearMapEditorStatus,
  updateLayer,
  updateAllLayers,
  deleteSelectedLayers,
  updateAllLayersBetween,
  updateLayersUpToRoot,
  updateLayerAndItsChildren,
  moveSelectedLayers,
  addNewMapLayer,
  setBrushCanvas,
  updateLayerTiles,
  assignLayerTiles,
  setLayerData,
  eraseTileInLayer,
  assignTilesetCanvases,
  assignFirstGuids,
  downloadMapAsTmx,
} = mapEditorSlice.actions;

export const selectMapEditorPrimitives = (state) => state.mapEditor.primitives;
export const selectMapFile = (state) => state.mapEditor.file;
export const selectBrushCanvas = (state) => state.mapEditor.brushCanvas;
export const selectLayerTiles = (state) => state.mapEditor.layerTiles;
export const selectLastSelectedLayer = state => state.mapEditor.primitives.lastSelectedLayer;
export const selectTilesetCanvases = state => state.mapEditor.tilesetCanvases;
export const selectFirstGuids = state => state.mapEditor.firstGuids;
export const selectMapEditorStatuses = (state) => state.mapEditor.statuses;
export const selectMapEditorErrors = (state) => state.mapEditor.errors;
export const selectLayerData = (state) => state.mapEditor.layerData;

export const mapEditorReducer = mapEditorSlice.reducer;
