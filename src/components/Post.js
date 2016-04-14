import React from 'react'
import { filter, find, first, includes, isEmpty, map, some, sortBy } from 'lodash'
const { array, bool, func, object } = React.PropTypes
import cx from 'classnames'
import {
  humanDate,
  nonbreaking,
  present,
  sanitize,
  textLength,
  appendInP
} from '../util/text'
import truncate from 'html-truncate'
import A from './A'
import Avatar from './Avatar'
import Dropdown from './Dropdown'
import { ClickCatchingSpan } from './ClickCatcher'
import Comment from './Comment'
import CommentForm from './CommentForm'
import LinkedPersonSentence from './LinkedPersonSentence'
import { scrollToAnchor } from '../util/scrolling'
import { connect } from 'react-redux'
import { compose } from 'redux'
import {
  fetchComments,
  followPost,
  notify,
  removePost,
  startPostEdit,
  voteOnPost
} from '../actions'
import { same } from '../models'
import { getComments, getCommunities } from '../models/post'
import { canEditPost } from '../models/currentUser'
import decode from 'ent/decode'

const spacer = <span>&nbsp; •&nbsp; </span>

class Post extends React.Component {
  static propTypes = {
    post: object,
    communities: array,
    comments: array,
    dispatch: func,
    expanded: bool,
    onExpand: func
  }

  static childContextTypes = {post: object}

  getChildContext () {
    return {post: this.props.post}
  }

  render () {
    const { post, communities, comments, expanded, onExpand } = this.props
    const { tag, media } = post
    const image = find(media, m => m.type === 'image')
    const classes = cx('post', tag, {image, expanded})
    const title = decode(post.name || '')
    const tagLabel = `#${post.tag === 'chat' ? 'all-topics' : post.tag}`

    return <div className={classes}>
      <Header communities={communities}/>
      <p className='title post-section'>{title}</p>
      {image && <img src={image.url} className='post-section full-image'/>}
      <Details {...{expanded, onExpand, tagLabel}}/>
      <div className='voting post-section'><VoteButton/><Voters/></div>
      <Attachments/>
      <CommentSection truncate={!expanded} expand={onExpand} comments={comments}/>
    </div>
  }
}

export default compose(
  connect((state, { post }) => {
    return {
      comments: getComments(post, state),
      communities: getCommunities(post, state)
    }
  })
)(Post)

export const UndecoratedPost = Post // for testing

export const Header = ({ communities }, { post, community }) => {
  const { tag } = post
  const person = tag === 'welcome' ? post.relatedUsers[0] : post.user
  const createdAt = new Date(post.created_at)
  if (!community) community = communities[0]

  return <div className='header'>
    <Menu/>
    <Avatar person={person}/>
    {tag === 'welcome'
      ? <WelcomePostHeader communities={communities}/>
      : <div>
          <A className='name' to={`/u/${person.id}`}>{person.name}</A>
          {spacer}
          <span className='meta'>
            <A to={`/p/${post.id}`}>{nonbreaking(humanDate(createdAt))}</A>
            &nbsp;in {community.name}
          </span>
        </div>}
  </div>
}
Header.contextTypes = {post: object, community: object}

const Details = ({ expanded, onExpand, tagLabel }, { post }) => {
  let description = present(sanitize(post.description))
  const truncated = !expanded && textLength(description) > 200
  if (truncated) description = truncate(description, 200)
  if (description !== '<p></p>') description = appendInP(description, '&nbsp;')

  return <div className='post-section details'>
    <ClickCatchingSpan dangerouslySetInnerHTML={{__html: description}}/>
    {truncated && <span>
      <a onClick={onExpand}>Show&nbsp;more</a>
      &nbsp;
    </span>}
    <a className='hashtag'>{tagLabel}</a>
  </div>
}
Details.contextTypes = {post: object}

const Attachments = (props, { post }) => {
  const attachments = filter(post.media, m => m.type !== 'image')
  if (isEmpty(attachments)) return <span/>

  return <div className='post-section'>
    {attachments.map((file, i) =>
      <a key={i} className='attachment' href={file.url} target='_blank' title={file.name}>
        <img src={file.thumbnail_url}/>
        {truncate(file.name, 40)}
      </a>)}
  </div>
}
Attachments.contextTypes = {post: object}

const WelcomePostHeader = ({ communities }, { post }) => {
  let person = post.relatedUsers[0]
  let community = communities[0]
  return <div>
    <strong><A to={`/u/${person.id}`}>{person.name}</A></strong> joined
    <span> </span>
    {community
      ? <span>
          <A to={`/c/${community.slug}`}>{community.name}</A>.
          <span> </span>
          <a className='open-comments'>
            Welcome them!
          </a>
        </span>
      : <span>
          a community that is no longer active.
        </span>}
  </div>
}
WelcomePostHeader.contextTypes = {post: object}

export const Menu = (props, { dispatch, post, currentUser }) => {
  const canEdit = canEditPost(currentUser, post)
  const following = some(post.followers, same('id', currentUser))
  const edit = () => dispatch(startPostEdit(post))
  const remove = () => window.confirm('Are you sure? This cannot be undone.') &&
    dispatch(removePost(post.id))

  return <Dropdown className='post-menu' alignRight={true}
    toggleChildren={<i className='glyphicon glyphicon-option-horizontal'></i>}>
    {canEdit && <li><a onClick={edit}>Edit</a></li>}
    {canEdit && <li><a onClick={remove}>Remove</a></li>}
    <li>
      <a onClick={() => dispatch(followPost(post.id, currentUser))}>
        Turn {following ? 'off' : 'on'} notifications for this post
      </a>
    </li>
    <li>
      <a onClick={() => window.alert('TODO')}>Report objectionable content</a>
    </li>
  </Dropdown>
}
Menu.contextTypes = {post: object, currentUser: object, dispatch: func}

export class CommentSection extends React.Component {
  static propTypes = {
    comments: array,
    truncate: bool,
    expand: func,
    dispatch: func
  }

  static contextTypes = {post: object, dispatch: func, currentUser: object}

  render () {
    let { comments, truncate, expand } = this.props
    const { dispatch, post, currentUser } = this.context
    if (!comments) comments = []
    comments = sortBy(comments, c => c.created_at)
    if (truncate) comments = comments.slice(-3)

    const expandComment = id => {
      expand()

      // the offset below is ignored by the backend, but it causes the frontend
      // to ignore the 3 comments that are already cached
      dispatch(fetchComments(post.id, {offset: 3}))
      .then(({ error }) => {
        if (error) {
          return dispatch(notify('Could not load comments. Please try again soon.', {type: 'error'}))
        }
        if (id) scrollToAnchor(`comment-${id}`, 15)
      })
    }

    return <div className={cx('comments-section post-section', {empty: isEmpty(comments)})}>
      <a name={`post-${post.id}-comments`}></a>
      {truncate && post.numComments > comments.length && <div className='comment show-all'>
        <a onClick={() => expandComment()}>Show all {post.numComments} comments</a>
      </div>}
      {comments.map(c => <Comment comment={{...c, post_id: post.id}}
        truncate={truncate}
        expand={() => expandComment(c.id)}
        key={c.id}/>)}
      {currentUser && <CommentForm postId={post.id}/>}
    </div>
  }
}

export const VoteButton = (props, { post, currentUser, dispatch }) => {
  let vote = () => dispatch(voteOnPost(post, currentUser))
  let myVote = includes(map(post.voters, 'id'), (currentUser || {}).id)
  return <a className='vote-button' onClick={vote}>
    <i className={`icon-heart-new${myVote ? '-selected' : ''}`}></i>
    {myVote ? 'Liked' : 'Like'}
  </a>
}
VoteButton.contextTypes = {post: object, currentUser: object, dispatch: func}

export const Voters = (props, { post, currentUser }) => {
  const voters = post.voters || []

  let onlyAuthorIsVoting = voters.length === 1 && same('id', first(voters), post.user)
  return voters.length > 0 && !onlyAuthorIsVoting
    ? <LinkedPersonSentence people={voters} className='voters meta'>
        liked this.
      </LinkedPersonSentence>
    : <span />
}
Voters.contextTypes = {post: object, currentUser: object}
