/** @jsx jsx */
import { css, jsx } from '@emotion/react';
import { useDispatch, useSelector } from 'react-redux';
import { Fragment, useEffect } from 'react';
import { LeftSidebarDrawer } from './LeftSidebarDrawer';
import { setLeftSidebarPrimitives } from './leftSidebarSlice';
import { IconButton } from '../../components/inputs/IconButton';
import { Link } from 'react-router-dom';
import { SelectMenu } from '../../components/inputs/SelectMenu';
import { Button, grayButtonStyle, redButtonStyle } from '../../components/inputs/Button';
import { Icon } from '../../components/Icon';
import { Textfield, whiteInputStyle } from '../../components/inputs/Textfield';
import { Checkbox } from '../../components/inputs/Checkbox';
import _ from 'lodash';
import { FlexColumn } from '../../components/Layouts/FlexColumn';
import { selectPrimitives, setTilesetEditorPrimitives } from '../TilesetEditor/tilesetEditorSlice';

const leftSidebarStyle = css`
  background: #3F3F3F;
  width: 54px;
  display: flex;
  height: 100%;
  position: absolute;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  z-index: 2;
  overflow-y: auto;
  padding: 48px 0;
  box-sizing: border-box;
  
  .group {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
`;

export function LeftSidebar ({ file }) {
  const dispatch = useDispatch();
  const leftSidebarSlice = useSelector((state) => state.leftSidebar);
  const showGrid = leftSidebarSlice.primitives.showGrid;
  const drawerOpen = leftSidebarSlice.primitives.drawerOpen;
  const drawerPage = leftSidebarSlice.primitives.drawerPage;
  const tilesetEditorPrimitives = useSelector(selectPrimitives);
  const activeTool = tilesetEditorPrimitives.activeTool;

  useEffect(() => {
    dispatch(setLeftSidebarPrimitives({ drawerOpen: false }));
  }, []);

  function openDrawer (page) {
    dispatch(setLeftSidebarPrimitives({ drawerOpen: true, drawerPage: page }));
  }

  async function closeDrawer () {
    dispatch(setLeftSidebarPrimitives({ drawerOpen: false }));
  }

  const downloadPage = (
    <Fragment>
      <SelectMenu
        label='Download file as'
        items={{ PNG: 'png', 'Tiled JSON (.tmj)': 'tmj' }}
        name='type'
        defaultValue='tmj'
      />
      <Button style={grayButtonStyle}>Download</Button>
    </Fragment>
  );

  const copyLinkStyle = css`
    background: white;
    color: black;
    display: flex;
    justify-content: space-between;
    border-radius: 4px;
    align-items: center;
    padding-left: 12px;
    cursor: pointer;
    user-select: none;

    // truncate span to ellipsis with width of 270px
    span {
      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 215px;
    }
  `;

  const sharedWithStyle = css`
    div {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header {
      margin-bottom: 4px;
    }
  `;

  const sharePage = (
    <Fragment>
      <FlexColumn gap={4}>
        <span>Sharing URL</span>
        <div css={copyLinkStyle}>
        <span className='link-container'>
          https://www.tiletogether.com/files/t4Kmfkh4QYEaB8iuXhTmFA/edit
        </span>
          <Icon color='black'>
            <span className='icon-copy'></span>
          </Icon>
        </div>
      </FlexColumn>
      <span>Users added to the list below can view and edit this file using the URL above.</span>
      <div css={sharedWithStyle}>
        <div className='header'>
          <h4>Currently shared with</h4>
          <IconButton>
            <span className='icon-plus'></span>
          </IconButton>
        </div>
        {['anawesomeuser3', 'anawesomeuser4', 'anawesomeuser5'].map((user, index) => (
          <div key={index}>
            <span>{user}</span>
            <IconButton>
              <span className='icon-trash'></span>
            </IconButton>
          </div>
        ))}
      </div>
    </Fragment>
  );

  let publishText;

  if (file.publishedAt) {
    const dateString = new Date(file.publishedAt).toLocaleDateString();
    publishText = `This ${file.type} was published on ${dateString}`;
  } else if (file) {
    publishText = `This ${file.type} has not been published yet`;
  }

  const settingsPage = (
    <Fragment>
      <Textfield
        placeholder={`Type a name for your ${file.type}`}
        label={`${_.capitalize(file.type)} name`}
        type='text'
        style={whiteInputStyle}
        name='name'
        defaultValue={file.name}
      />
      <Checkbox
        label='View grid lines'
        name='gridLines'
        checked={showGrid}
        onChange={(e) => dispatch(setLeftSidebarPrimitives({ showGrid: e.target.checked }))}
      />
      <h4>{publishText}</h4>
      <div css={css`display: flex; gap: 24px; justify-content: flex-start;`}>
        <Button style={grayButtonStyle}>{file.publishedAt ? 'Unpublish' : 'Publish'}</Button>
        <Button style={redButtonStyle}>Delete</Button>
      </div>
    </Fragment>
  );

  const divider = (
    <div css={css`background: #5f5f5f;
      height: 5px;
      width: 100%;
      border-radius: 4px;`}></div>
  );

  function setActiveTool (tool) {
    dispatch(setTilesetEditorPrimitives({ activeTool: tool }));
  }

  return (
    <Fragment>
      <LeftSidebarDrawer
        open={drawerOpen}
        onClose={closeDrawer}
      >
        {drawerPage === 'download' && downloadPage}
        {drawerPage === 'share' && sharePage}
        {drawerPage === 'settings' && settingsPage}
      </LeftSidebarDrawer>
      <div css={leftSidebarStyle}>
        <div className='group'>
          <IconButton active={activeTool === 'draw' && !drawerOpen} onClick={() => setActiveTool('draw')}>
            <span className='icon-pencil'></span>
          </IconButton>
          <IconButton active={activeTool === 'erase' && !drawerOpen} onClick={() => setActiveTool('erase')}>
            <span className='icon-eraser'></span>
          </IconButton>
          <IconButton active={activeTool === 'select' && !drawerOpen} onClick={() => setActiveTool('select')}>
            <span className='icon-cursor'></span>
          </IconButton>
        </div>
        <div className='group'>
          <IconButton onClick={() => openDrawer('download')} title={`Download ${file.type}`}>
            <span className='icon-download'></span>
          </IconButton>
          <IconButton onClick={() => openDrawer('share')} title='Collaboration settings'>
            <span className='icon-share'></span>
          </IconButton>
          <IconButton onClick={() => openDrawer('settings')} title={`${_.capitalize(file.type)} properties`}>
            <span className='icon-settings'></span>
          </IconButton>
          {divider}
          {file.publishedAt && (
            <Link to={`/${file.type}s/${file.id}`} title={`View published ${file.type}`} style={{ textDecoration: 'none' }}>
              <IconButton>
                <span className='icon-globe'></span>
              </IconButton>
            </Link>
          )}
          <Link to='/your-files' title='Go to your files' style={{ textDecoration: 'none' }}>
            <IconButton>
              <span className='icon-logo'></span>
            </IconButton>
          </Link>
        </div>
      </div>
    </Fragment>
  );
}
