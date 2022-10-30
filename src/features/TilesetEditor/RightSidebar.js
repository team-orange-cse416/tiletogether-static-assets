/** @jsx jsx */
import { css, jsx } from '@emotion/react';
import { Icon } from '../../components/Icon';
import { ColorSet } from './ColorSet';
import _ from 'lodash';

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
  padding: 16px 0;
  box-sizing: border-box;
  gap: 16px;
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
`;

export function RightSidebar () {
  function getRandomColor () {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }
  const colors = _.range(0, 80).map(() => getRandomColor());

  return (
    <div css={rightSidebarStyle}>
      <div>
        <div className='header'>
          <Icon color='white'>
            <span className='icon-paint-roller'></span>
          </Icon>
          <span>Color set</span>
        </div>
        <ColorSet colors={colors} />
      </div>
      <div className={'current-color'}>
        <div className='header'>
          <Icon color='white'>
            <span className='icon-droplet'></span>
          </Icon>
          <span>Current color</span>
        </div>
        <input type="color" />
      </div>
      <div className='header'>
        <Icon color='white'>
          <span className='icon-layers'></span>
        </Icon>
        <span>Layers</span>
      </div>
    </div>
  );
}
