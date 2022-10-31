/** @jsx jsx */
import { css, jsx } from '@emotion/react';
import { Icon } from '../../components/Icon';
import { Layer } from '../Editor/Layer';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import { Text } from 'react-konva';
import { FlexRow } from '../../components/Layouts/FlexRow';
import { IconButton } from '../../components/inputs/IconButton';

const rightSidebarStyle = css`
  background: #3F3F3F;
  width: 270px;
  display: flex;
  height: 100%;
  position: absolute;
  right: 0;
  flex-direction: column;
  color: white;
  overflow-y: auto;
  padding-top: 16px;
  box-sizing: border-box;
  z-index: 1;

  .header {
    display: flex;
    flex-direction: row;
    gap: 4px;
    align-items: center;
  }

  .current-color {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 18px;
  }

  .selected-tiles {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    
    canvas {
      background: #bfbfbf;
      width: 100%;
      height: 213px;
    }
  }
  
  .layers {
    padding-left: 10px;
    height: 100%;
    overflow: auto;
  }
`;

const tilesetsStyle = css`
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 8px;
  user-select: none;
  height: 300px;
  overflow-y: scroll;
  
  .tileset {
    padding: 10px;
    background: #2D2D2D;
    border-radius: 7px;
    cursor: pointer;
    
    &:hover {
      background: #4D4D4D;
    }
    
    &.selected {
      background: #73809A;
    }
  }
`;

export function Divider () {
  const dividerStyle = css`
    width: 100%;
    height: 18px;
  `;

  return <div css={dividerStyle} />;
}

export function RightSidebar () {
  const mapEditorSlice = useSelector((state) => state.mapEditor);
  const file = mapEditorSlice.file;
  const rootLayer = file.rootLayer;

  useEffect(() => {
    console.log(rootLayer);
  }, [file]);

  return (
    <div css={rightSidebarStyle}>
      <FlexRow justify={'space-between'}>
        <FlexRow gap={4}>
          <Icon color='white'>
            <span className='icon-paint-roller'></span>
          </Icon>
          <span>Tilesets</span>
        </FlexRow>
        <FlexRow gap={7}>
          <IconButton>
            <span className='icon-plus'></span>
          </IconButton>
          <IconButton>
            <span className='icon-trash'></span>
          </IconButton>
        </FlexRow>
      </FlexRow>
      <FlexRow style={tilesetsStyle}>
        <div className={'tileset selected'}>
          <Text>Bridges</Text>
        </div>
        {['Dirt', 'Grass', 'Hills', 'Mountains', 'Rivers', 'Roads', 'Rocks', 'Sand', 'Shallow Water', 'Snow', 'Trees', 'Water'].map((tilesetName, index) => (
          <div className={'tileset'} key={index}>
            <Text>{tilesetName}</Text>
          </div>
        ))}
      </FlexRow>
      <Divider />
      <div className='header'>
        <Icon color='white'>
          <span className='icon-droplet'></span>
        </Icon>
        <span>Selected Tiles</span>
      </div>
      <Divider />
      <div className='selected-tiles'>
        <canvas></canvas>
      </div>
      <Divider />
      <div className='header'>
        <Icon color='white'>
          <span className='icon-layers'></span>
        </Icon>
        <span>Layers</span>
      </div>
      <div className='layers'>
        <Layer layer={rootLayer} />
      </div>
    </div>
  );
}
