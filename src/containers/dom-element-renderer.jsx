import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React from 'react';
import Style from 'to-style';
import stylePropType from 'react-style-proptype';

/*
 * DOMElementRenderer wraps a DOM element, allowing it to be
 * rendered by React. It's up to the containing component
 * to retain a reference to the element prop, or else it
 * will be garbage collected after unmounting.
 *
 * Props passed to the DOMElementRenderer will be set on the
 * DOM element like it's a normal component.
 */
class DOMElementRenderer extends React.Component {
    constructor (props) {
        super(props);
        this.setContainer = this.setContainer.bind(this);
    }
    componentDidMount () {
        this.container.appendChild(this.props.domElement);
    }
    componentWillUnmount () {
        // The same DOM element (e.g. the shared stage canvas) can be moved
        // between two DOMElementRenderer instances within a single commit
        // (splitting / merging the stage window). Only remove it when it is
        // still a child of this container, otherwise removeChild would throw
        // a NotFoundError and crash the whole app.
        if (this.container && this.props.domElement.parentNode === this.container) {
            this.container.removeChild(this.props.domElement);
        }
    }
    setContainer (c) {
        this.container = c;
    }
    render () {
        // Apply props to the DOM element, so its attributes
        // are updated as if it were a normal component.
        // Look at me, I'm the React now!
        Object.assign(
            this.props.domElement,
            omit(this.props, ['domElement', 'children', 'style'])
        );

        // Convert react style prop to dom element styling.
        if (this.props.style) {
            this.props.domElement.style.cssText = Style.string(this.props.style);
        }

        return <div ref={this.setContainer} />;
    }
}

DOMElementRenderer.propTypes = {
    domElement: PropTypes.instanceOf(Element).isRequired,
    style: stylePropType
};

export default DOMElementRenderer;
