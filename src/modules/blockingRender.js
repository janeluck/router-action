/**
 * Created by jane on 21/04/2018.
 */

import React, {Component} from 'react'
import ReactDom, {render} from 'react-dom'
import PropTypes from 'prop-types'
import Animate from 'rc-animate'
import 'rc-dialog/assets/index.css'
import Dialog from 'rc-dialog'


import {ajax} from '../util'

import {traceLifecycle} from 'react-lifecycle-visualizer';

@traceLifecycle
class ComponentToTrace extends React.Component {

    render() {
        return (
            <div>
                lifecyclepanel
                <this.LifecyclePanel/>
            </div>
        );
    }
}


export default class A extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        return <ComponentToTrace />
    }
}


export  class C extends Component {
    constructor(props) {
        super(props)
    }

    container = null


    state = {
        visible: true,
    }

    /*  onAppear = (key) => {
          console.log('appear', key);
      }

      onEnter = (key) => {
          console.log('enter', key);
      }

      onLeave = (key) => {
          console.log('leave', key);
      }

      toggleAnimate = () => {
          this.setState({
              visible: !this.state.visible,
          });
      }


      componentDidMount() {

          const div2 = document.getElementById('div2')
          this.getContainer()
          this.renderPortal()
      }

      removePortal = () => {
          console.log('unmountComponent')
          ReactDom.unmountComponentAtNode(this.container)
      }

      getContainer() {
          const container = document.createElement('div')
          document.body.appendChild(container)
          this.container = container
      }

      renderPortal = () => {
          ReactDom.render(<Dialog
              maskClosable
              closable
              title={'ss'}
              visible
          >
              <p>first dialog</p>
              <button onClick={this.removeInAPromise}>
                  click me!
              </button>
          </Dialog>, this.container)
      }

      removeInAPromise = () => {
          const p = new Promise(resolve => {
              resolve()
              console.log('Promise inter')
              this.removePortal()
              //  resolve()
          })

          p.then(() => {
              console.log('then consoled')
              debugger
              new ajax({
                  async: false,
                  url: 'http://www.json-generator.com/api/json/get/bTETpwnziq?indent=2'
              })
          })
      }*/

    render() {
        const {visible} = this.state

        return <div id='div1'>
            div1
            <button onClick={() => {
                this.setState({
                    visible: !visible
                })
            }
            }>toggle
            </button>
            <div id='div2'>
                div211
                <Animate
                    component="div"
                    style={null}
                    transitionName="fade"
                >
                    {visible && <div key={"loading"}>loading</div>}
                    <div key={'testanimation'}>11</div>
                </Animate>

            </div>


        </div>
    }
}
