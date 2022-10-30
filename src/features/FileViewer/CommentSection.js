/** @jsx jsx */
import { css, jsx } from '@emotion/react';
import { FlexRow } from '../../components/Layouts/FlexRow';
import { FlexColumn } from '../../components/Layouts/FlexColumn';
import { timeUtils } from '../../utils/timeUtils';
import { useRef } from 'react';
import { Button, IconButtonStyle, likeButtonStyle, whiteButtonStyle, blackButtonStyle } from '../../components/inputs/Button';

export function CommentSection ({ authorUserName, comments }) {
  console.log(authorUserName);
  const userButtonRef = useRef(null);
  const likeButtonRef = useRef(null);

  const verticalSectionStyle = css`
  color: white;
  padding: 10px 0 0 0;
`;

  const commentInputStyle = css`
    padding: 10px;
    margin-right: 10px;
    border-radius:4px;
    width: 58vw;
  `;

  return (
    <FlexColumn>
        <FlexRow>
            <div css={[verticalSectionStyle, { marginRight: '10px' }]}>
                {comments.length} Comments
            </div>
            <div css={verticalSectionStyle}>
                Sort By
            </div>
        </FlexRow>

        <FlexRow>
        <div css={[IconButtonStyle, verticalSectionStyle, { marginLeft: '0px' }]} ref={userButtonRef} >
          <FlexRow>
          <span className='icon-avatar' css={{ fontSize: '60px' }}/>
                   <input css={commentInputStyle} name="content" placeholder="Add comment ..."/>
           <FlexRow style={{ marginRight: 'auto' }}>
            <Button css = {[blackButtonStyle, { marginRight: '10px' }]}>
              Cancel</Button>
              <Button css= {whiteButtonStyle} >Comment</Button>
            </FlexRow>
      </FlexRow>
        </div>
      </FlexRow>
      <hr color='gray'/>
     <FlexColumn>
        {comments.map((c, i) =>
        <FlexColumn css={{ color: 'white' }} key={i}>
        <FlexRow>
          <span className='icon-avatar' css={{ fontSize: '42px' }}/>
          <div>
            <span css={{ marginRight: '10px' }}>{c.username}</span>
            <span>{timeUtils.timeAgo(new Date(c.createdAt)) + ' ago'}</span>
          </div>
          </FlexRow>
          <div>
            {c.content}
          </div>
          <FlexRow>
            <button css={[IconButtonStyle, likeButtonStyle, { marginLeft: '0px' }]} ref={likeButtonRef}>
            <span>{10}</span>
               <span className='icon-like-unfilled' css={{ fontSize: '42px' }}/>
          </button>
            <div css={{ fontWeight: 'bold' }}>Reply</div>
          </FlexRow>
          <div css={{ color: '#4894F9' }}>{'View 278 Replies'}</div>
        </FlexColumn>)}
      </FlexColumn>
    </FlexColumn>
  );
}