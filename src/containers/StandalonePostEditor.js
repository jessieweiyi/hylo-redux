import React from 'react'
import { prefetch } from 'react-fetcher'
import { connect } from 'react-redux'
import { fetchPost, navigate, startPostEdit } from '../actions'
import { getCommunities, getPost } from '../models/post'
import { PostEditor } from '../components/PostEditor'
import createHistory from 'history/lib/createBrowserHistory'
const { func, object } = React.PropTypes

@prefetch(({ store, dispatch, params: { id } }) =>
  dispatch(fetchPost(id))
  .then(() => {
    const post = getPost(id, store.getState())
    return dispatch(startPostEdit(post))
  }))
@connect((state, { params: { id } }) => {
  const post = getPost(id, state)
  return {
    post,
    postEdit: state.postEdits[id],
    communities: getCommunities(post, state)
  }
})
export default class StandalonePostEditor extends React.Component {
  static propTypes = {
    post: object,
    postEdit: object,
    dispatch: func
  }

  render () {
    const { post, postEdit, dispatch } = this.props
    const { editor } = this.refs
    if (!postEdit) return <div className='loading'>Loading...</div>

    const goBack = () => {
      if (window.history && window.history.length > 2) {
        createHistory().goBack()
      } else {
        dispatch(navigate(`/p/${post.id}`))
      }
    }
    return <div className='standalone-post-editor'>
      <div className='top-menu'>
        <a className='save' onClick={() => editor.saveIfValid()}>Save</a>
        <a className='back' onClick={() => editor.cancel()}>
          <span className='left-angle-bracket'>&#x3008;</span>
          Back
        </a>
        <div className='title'>Editing post</div>
      </div>
      <PostEditor post={post} ref='editor' onCancel={goBack}/>
    </div>
  }
}
