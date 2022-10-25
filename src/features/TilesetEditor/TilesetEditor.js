/** @jsx jsx */
import { css, jsx } from '@emotion/react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getFileToEdit } from '../File/fileSlice';
import { LeftSidebar } from '../Editor/LeftSidebar';
import { useParams } from 'react-router-dom';
import { FilenameIndicator } from '../Editor/FilenameIndicator';
import { NotFound } from '../Editor/NotFound';

const tilesetEditorStyle = css`
`;

export function TilesetEditor () {
  const { id } = useParams();
  const dispatch = useDispatch();
  const fileSlice = useSelector((state) => state.file);
  const error = fileSlice.errors.includes('getFileToEdit');

  useEffect(() => {
    dispatch(getFileToEdit({ id }));
  }, []);

  let content;

  if (!error) {
    content = (
      <div css={tilesetEditorStyle}>
        <LeftSidebar />
        <FilenameIndicator />
      </div>
    );
  } else {
    content = (
      <NotFound />
    );
  }

  return content;
}