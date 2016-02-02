import React from 'react'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import Html from '../containers/Html'
import { promisify } from 'bluebird'
import makeRoutes from '../routes'
import { configureStore } from '../store'
import { Provider } from 'react-redux'
import { match, RoutingContext } from 'react-router'
import createHistory from 'history/lib/createMemoryHistory'
import { syncReduxAndRouter } from 'redux-simple-router'
import { getPrefetchedData } from 'react-fetcher'
import { cyan, red } from 'chalk'
import { info, debug } from '../util/logging'
import { fetchCurrentUser } from '../actions'
import { localsForPrefetch } from '../util/universal'
import { getManifest } from '../util/assets'
import { any, isEmpty, pairs } from 'lodash'

const matchPromise = promisify(match, {multiArgs: true})

const checkAPIErrors = ({ errors }) => {
  return any(pairs(errors), ([key, { payload: { response } }]) => {
    if (!response) return false
    let { status, url } = response
    debug(red(`${key} caused ${status} at ${url}`))
    return true
  })
}

export default function (req, res) {
  info(cyan(`${req.method} ${req.originalUrl}`))

  const store = configureStore({}, req)
  const routes = makeRoutes(store)
  const history = createHistory()

  return store.dispatch(fetchCurrentUser())
  .then(() => matchPromise({routes, location: req.originalUrl}))
  .then(([redirectLocation, renderProps]) => {
    if (redirectLocation) {
      res.redirect(302, redirectLocation.pathname + redirectLocation.search)
      return
    }

    if (!renderProps) {
      res.status(404).send('Not found')
      return
    }

    return renderApp(res, renderProps, history, store)
    .then(renderToStaticMarkup)
    .then(html => res.status(200).send(`<!DOCTYPE html>\n${html}`))
    .then(() => {
      let state = store.getState()
      checkAPIErrors(state)
      if (!isEmpty(state.errors)) {
        res.errors = state.errors
      }
    })
  })
  .catch(err => {
    res.errors = [err]
    res.setHeader('Content-Type', 'text/plain')
    res.status(500).send(err.stack)
  })
}

function renderApp (res, renderProps, history, store) {
  const components = renderProps.routes.map(r => r.component)
  const locals = localsForPrefetch(renderProps, store)

  return getPrefetchedData(components, locals)
  .then(() => {
    // if this runs before getPrefetchedData it hangs -- infinite loop?
    history.transitionTo(renderProps.location)
    syncReduxAndRouter(history, store)

    const markup = renderToString(
      <Provider store={store}>
        <RoutingContext location='history' {...renderProps}/>
      </Provider>
    )

    return React.createElement(Html, {
      markup: markup,
      state: `window.INITIAL_STATE=${JSON.stringify(store.getState())}`,
      assetManifest: `window.ASSET_MANIFEST=${JSON.stringify(getManifest())}`
    })
  })
}
