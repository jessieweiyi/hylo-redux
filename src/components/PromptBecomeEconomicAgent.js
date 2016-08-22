import React from 'react'
import { Link } from 'react-router'

class PromptBecomeEconomicAgent extends React.Component {

  constructor(props) {
    super(props)
  }

  render () {
    const { thing } = this.props
    const promptText = "Please connect a HitFin account to pledge funds to projects. You can do this in the Payment Details section of your Account Settings"
    return(
      <div className='prompt-become-economic-agent'>
        <Link to='/settings'>
          {promptText}
        </Link>
      </div>
    )
  }
}

export default PromptBecomeEconomicAgent