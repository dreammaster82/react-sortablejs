/**
 * @author RubaXa <trash@rubaxa.org>
 * @licence MIT
 */
import Sortable from 'sortablejs';
import React from 'react';

let _nextSibling;

let _activeComponent;

let oldInd;

let _defaultOptions = {
    ref: 'ref',
    model: 'items',

    animation: 100,
    onStart: 'handleStart',
    onEnd: 'handleEnd',
    onAdd: 'handleAdd',
    onUpdate: 'handleUpdate',
    onRemove: 'handleRemove',
    onSort: 'handleSort',
    onFilter: 'handleFilter',
    onMove: 'handleMove',
    onClone: 'handleClone'
};

export default (sortableOptions) => {
	let options = Object.assign({}, _defaultOptions, (sortableOptions == 'function' ? sortableOptions() : sortableOptions || {}));
	return (ReactComponent) => {
        function _getModelName() {
            return options.model;
        }

        function _getModelItems(component) {
            let name = _getModelName(),
                items = component.state && component.state[name] || component.props[name];

            return items.slice();
        }

        return class ReactSortable extends React.PureComponent {
        	constructor(props) {
        		super(props);
        		this._sortableInstance = null;
        		this.ref = React.createRef();
        		this.state = {};
			}

            createSortable() {
                let copyOptions = Object.assign({}, options, {disabled: this.props.disabled}),
                    emitEvent = (/** string */type, /** Event */evt) => {
                        var method = options[type];
                        if (method && typeof method === "string") {
                            method = this[method];
                        }
                        method && typeof method === "function" && method.call(this, evt, this._sortableInstance);
                    }, sortableComponent = this.ref.current && this.ref.current;


                if (!sortableComponent) throw 'Sortable component must be';

                // Bind callbacks so that "this" refers to the component
                'onStart onEnd onAdd onSort onUpdate onRemove onFilter onMove onClone'.split(' ').forEach(function (/** string */name) {
                    copyOptions[name] = (evt) => {
                        if (name === 'onStart') {
                            _nextSibling = evt.item.nextElementSibling;
                            _activeComponent = sortableComponent;
                            oldInd = -1//Sortable.utils.index(evt.item, '');
                        } else if (name === 'onAdd' || name === 'onUpdate') {
                            evt.from.insertBefore(evt.item, _nextSibling);

                            var newState = {},
                                remoteState = {},
                                items = _getModelItems(sortableComponent),
                                oldIndex = oldInd != -1 ? oldInd : evt.oldIndex,
                                newIndex = evt.newIndex,
                                remoteItems,
                                item;

                            if (name === 'onAdd') {
                                remoteItems = _getModelItems(_activeComponent);
                                item = remoteItems.splice(oldIndex, 1)[0];
                                items.splice(newIndex, 0, item);

                                remoteState[_getModelName(_activeComponent)] = remoteItems;
                            }
                            else {
                                items.splice(newIndex, 0, items.splice(oldIndex, 1)[0]);
                            }

                            newState[_getModelName(sortableComponent)] = items;

                            if (copyOptions.stateHandler) {
								sortableComponent[copyOptions.stateHandler](newState, evt);
                            } else {
                                this.setState(newState);
                            }

                            if(sortableComponent !== _activeComponent){
                                if (copyOptions.stateHandler && _activeComponent[copyOptions.stateHandler]) {
                                    _activeComponent[copyOptions.stateHandler](remoteState, evt);
                                } else {
                                    _activeComponent.setState(remoteState);
                                }
                            }
                        }

                        setTimeout(function () {
                            emitEvent(name, evt);
                        }, 0);
                    };
                }, this);

                let DOMEl = sortableComponent[options.ref] && sortableComponent[options.ref].current || sortableComponent;
                if (DOMEl && DOMEl instanceof HTMLElement) {
					this._sortableInstance = Sortable.create(DOMEl, copyOptions);
				} else throw 'Ref must be HTMLElement';

            }

            componentDidMount() {
                this.createSortable();
            }

            componentWillUnmount() {
        		if (this._sortableInstance) {
					this._sortableInstance.destroy();
					this._sortableInstance = null;
				}
            }

            static getDerivedStateFromProps(props, state) {
                var newState = {},
                    modelName = _getModelName(),
                    items = props[modelName];

                if (items) {
                    newState[modelName] = items;
                    return newState;
                } else return null;
            }

            recreate() {
                this._sortableInstance.destroy();
                this.createSortable();
            }

            render() {
        	    return <React.Fragment><ReactComponent {...this.props} {...this.state} recreate={this.recreate} ref={this.ref} /></React.Fragment>
            }
        };
	};
};
