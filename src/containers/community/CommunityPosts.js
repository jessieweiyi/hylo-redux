import React from 'react'
import { fetchPosts } from '../../actions'
import { connect } from 'react-redux'
import { prefetch } from 'react-fetcher'
import ConnectedPostList from '../../containers/ConnectedPostList'
import PostEditor from '../../components/PostEditor'
const { func, object } = React.PropTypes
import qs from 'querystring'

const fetch = (id, opts = {}) =>
  fetchPosts({subject: 'community', id, type: 'all+welcome', limit: 20, ...opts})

@prefetch(({ dispatch, params }) => dispatch(fetch(params.id)))
@connect((state, { params }) => ({community: state.communities[params.id]}))
export default class CommunityPosts extends React.Component {
  static propTypes = {
    dispatch: func,
    params: object,
    community: object
  }

  render () {
    let { community, params: { id } } = this.props
    let type = 'all+welcome'
    let query = qs.stringify({id, type})
    return <div>
      <PostEditor community={community}/>
      <ConnectedPostList fetch={opts => fetch(id, opts)} query={query}/>
    </div>
  }
}
