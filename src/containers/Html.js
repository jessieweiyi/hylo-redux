import React from 'react'
import { assetUrl } from '../util/assets'
import { map } from 'lodash'
var { string, object } = React.PropTypes

class Html extends React.Component {
  static propTypes = {
    pageTitle: string,
    markup: string,
    state: string,
    assetManifest: string,
    metaTags: object
  }

  render () {
    let { pageTitle, markup, state, assetManifest, metaTags } = this.props
    return <html>
      <head>
        <title>{pageTitle}</title>
        <link rel='stylesheet' type='text/css' href={assetUrl('/index.css')}/>
        { process.env.NODE_ENV === 'production'
        ? <link rel='shortcut icon' href='/favicon.png?v=2' />
      : <link rel='shortcut icon' href='/faviconDev.png?v=2' />}
        <script type='text/javascript' async src='https://platform.twitter.com/widgets.js'></script>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, user-scalable=no'/>
        {map(metaTags, (val, key) => <meta property={key} content={val} key={key} />)}
        <script type='text/javascript' src='https://use.typekit.net/npw4ouq.js'></script>
        <script type='text/javascript'>{`try{Typekit.load({async:true});}catch(e){}`}</script>
      </head>
      <body>
        <div id='app' dangerouslySetInnerHTML={{__html: markup}}></div>
        <script src='//cdnjs.cloudflare.com/ajax/libs/tinymce/4.2.8/tinymce.min.js'></script>
        <script dangerouslySetInnerHTML={{__html: state}}></script>
        <script dangerouslySetInnerHTML={{__html: assetManifest}}></script>
        <script src={assetUrl('/index.js')} defer></script>
      </body>
    </html>
  }
}

export default Html

// this url has plugins embedded:
// tinymce.cachefly.net/4.2/tinymce.min.js

// this one doesn't, so plugins get fetched the first time an editor is shown:
// cdnjs.cloudflare.com/ajax/libs/tinymce/4.2.8/tinymce.min.js
