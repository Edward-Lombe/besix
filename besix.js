/**
 *  Top level export, IIFE that returns an object that contains the Model,
 *  ModelView, Collection, CollectionView as well as the other various helper
 *  classes that are used such as Event, Tie and the symbols used.
 */
export default (() => {

  /**
   *  This is going to need to be changed to a more general reference, but
   *  currently it allows for use of templates that are not within the main
   *  document (i.e. from a HTML import)
   */
  const documentReference = document.querySelector('link[rel=import]').import;

  /**
   *  @constant
   *  This object contains all the references to all of the symbols used
   *  internally. They are used mostly to provide a 'hidden' property on
   *  objects, being that they are non-enumerable, and you need the exact
   *  reference in order to access the property.
   */
  const symbols = {
    Event : {
      data : Symbol('Event.data')
    },
    Tie : {
      data : Symbol('Tie.data'),
      handlers : Symbol('Tie.handlers'),
      trigger : Symbol('Tie.trigger'),
      source : Symbol('Tie.source'),
      modifier : Symbol('Tie.modifier'),
      destination : Symbol('Tie.destination')
    },
    Model : {
      change : Symbol('Model.change'),
      data : Symbol('Model.data')
    },
    ModelView : {
      ties : Symbol('ModelView.ties')
    },
    Collection : {
      length : Symbol('Collection.length'),
      change : Symbol('Collection.change'),
      data : Symbol('Collection.data'),
      addTriggers : Symbol('Collection.addTriggers()')
    }
  };

  /**
   *  @constant
   *  Stores methods shared by the Model and Collection classes. The functions
   *  are bound to the scope of the calling class through the use of the '::'
   *  (function bind) operator.
   *  @example
   *  // The fetch function will execute as if it was an instance of the parent
   *  return this::dataMethods.fetch();
   */
  const dataMethods = {
    fetch(sURL) {
      return new Promise((resolve, reject) => {
        let URL = sURL || this.properties.URL;
        let request = new XMLHttpRequest();
        request.overrideMimeType('application/json');
        request.addEventListener('load', function () {
          resolve(this);
        });
        request.open("GET", URL, true);
        request.send();
      });
    }
  };

  /*
   *  Stores methods the same way as the dataMethods object, but simply for the
   *  ModelView and CollectionView classes.
   */
  const viewMethods = {
    select(sElement, oOptions = { shadow : false, all : false }) {
      let selector = oOptions.all ? 'querySelectorAll' : 'querySelector';
      return oOptions.shadow ?
        this.shadowRoot[selector](sElement) :
        this[selector](sElement);
    },
    register(sTag) {
      let DOMConstructor = document.registerElement(sTag, this);
      this.DOMConstructor = DOMConstructor;
      return DOMConstructor;
    }
  };

  /**
   *  @class
   *  A slightly non-compliant implementation of the EventTarget interface, this
   *  class is designed to allow you to treat DOM Nodes and standard objects in
   *  the same way when you are adding or removing events.
   */
  class Event {

    /**
     *
     */
    constructor() {
      this[symbols.Event.data] = {};
    }

    /**
     *
     */
    addEventListener(sEvent, fnHandler) {
      let eventData = this[symbols.Event.data];
      // let fnBoundEvent = fnHandler.bind(oThis || this);
      if (typeof eventData[sEvent] === 'undefined') {
        eventData[sEvent] = [fnHandler];
      } else {
        eventData[sEvent].push(fnHandler);
      }
    }

    /**
     *
     */
    dispatchEvent(sEvent, ...eventArgs) {
      let eventData = this[symbols.Event.data];
      if (typeof eventData[sEvent] !== 'undefined') {
        eventData[sEvent].forEach(fnEvent => {
          fnEvent(...eventArgs);
        });
      }
    }

    /**
     *
     */
    removeEventListener(sEvent, fnHandler) {
      let eventData = this[symbols.Event.data];
      eventData[sEvent] = eventData.filter(fnEvent => {
        return fnHandler !== fnEvent;
      });
    }
  }

  /**
   *  @class
   *  The Tie class is essentially the class that handles all data binding. It
   *  takes one argument, an array. This array contains four arrays, and they
   *  define the event(s) that will 'trigger' a data flow, the source(s) of the
   *  data flow, the functions to transform that data, and finally the
   *  destination(s) that the data will be sent to.
   */
  class Tie {

    /**
     *  @constructs
     *  @example
     *  // Bind the value of the input to the selected <div> tag
     *  let input = docuement.querySelector('input');
     *  let div = docuement.querySelector('div');
     *  let tie = new Tie([
     *    [input, 'change'], // trigger
     *    [input, 'value'], // source
     *    [([a]) => a], // modifier
     *    [div, 'textContent'] // destination
     *  ]);
     *  @param {Array} aArguments
     */
    constructor(aArguments) {
      let [trigger, source, modifier, destination] = [...aArguments];

      this[symbols.Tie.trigger] = trigger;
      this[symbols.Tie.source] = source;
      this[symbols.Tie.modifier] = modifier;
      this[symbols.Tie.destination] = destination;

      Tie.addDoubleIterator(trigger);
      Tie.addDoubleIterator(source);
      Tie.addDoubleIterator(destination);

      this.addListeners();

    }

    /**
     *  @instance
     *  Adds all of the triggers to the specified sources
     */
    addListeners() {
      let trigger = this[symbols.Tie.trigger];
      for (let [target, eventName] of trigger) {
        target.addEventListener(eventName, ::this.eventHandler);
      }
    }

    /**
     *  @instance
     *  Removes all listeners from the specified sources
     */
    removeListeners() {
      let trigger = this[symbols.Tie.trigger];
      for (let [target, eventName] of trigger) {
        target.removeEventListener(eventName, this.eventHandler);
      }
    }

    /**
     *  @instance @event
     *  The handler used to get the source and set the destination, once the
     *  has been fired
     */
    eventHandler(e) {
      let source = this[symbols.Tie.source];
      let modifier = this[symbols.Tie.modifier];
      let destination = this[symbols.Tie.destination];
      let sourceMap = [];

      for (let [sourceObject, sourceKey] of source) {
        if (typeof sourceObject === 'function') {
          sourceMap.push(sourceObject(...sourceKey));
        } else {
          sourceMap.push(sourceObject[sourceKey]);
        }
      }

      for (let modify of modifier) {
        sourceMap = modify(sourceMap);
      }

      for (let [destinationObject, destinationKey] of destination) {
        if (typeof destinationObject[destinationKey] === 'function') {
          destinationObject[destinationKey](sourceMap);
        } else {
          destinationObject[destinationKey] = sourceMap;
        }
      }
    }

    /**
     *  @static
     *  Adds a special iterator to an array that makes iteration return two
     *  indexes at a time
     *  @example
     *  let array = Tie.addDoubleIterator([1, 2, 3, 4]);
     *  // Will log [1, 2] then [3, 4]
     *  for (let elements of array) {
     *    console.log(elements);
     *  }
     */
    static addDoubleIterator(array) {
      array[Symbol.iterator] = function* () {
        for (let i = 0; i < array.length; i += 2) {
          yield [array[i], array[i + 1]];
        }
      };
      return array;
    }

  }

  /**
   *  @class
   *  The Model class can be essentially treated as an object that you can add
   *  handlers that listen to its properties and fire events whenever it is
   *  changed. The Model class is also designed to encapsulate as much of its
   *  internal methods, so that you can treat is just as any other object, and
   *  not have to worry about mutating the prototype. For example, the Model
   *  can be iterated over with a standard `for (... of ...)` loop and keys can
   *  be set with either '.<key>' or '[<key>]' notation.
   */
  class Model extends Event {

    /**
     *  The getter function for the properties is simply a way to mimic
     *  instance bound class properties. As the function is a getter function
     *  it does not show up during enumeration of the object.
     */
    get properties() { return {}; }

    /**
     *  The defaults getter is used to represent the initial data content of
     *  an instance of the Model class.
     */
    get defaults() { return {}; }

    /**
     *
     */
    constructor(oData) {
      super();
      let copyProperties = (base, extend) => {
        for (let key in extend) {
          base[key] = extend[key];
        }
      };
      let data = this[symbols.Model.data] = {};
      copyProperties(data, this.defaults);
      copyProperties(data, oData);
      // Object.assign(data, this.defaults, oData);
      for (let key in data) {
        this.set(key, data[key]);
      }
    }

    /**
     *
     */
    *[Symbol.iterator]() {
      let data = this[symbols.Model.data];
      for (let key in data) {
        yield data[key];
      }
    }

    /**
     *
     */
    fetch(URL) {
      return this::dataMethods.fetch(URL);
    }

    /**
     *
     */
    set(sKey, value) {
      let data = this[symbols.Model.data];
      data[sKey] = value;
      Object.defineProperty(this, sKey, {
        configurable : true,
        enumerable : true,
        get : function () {
          return data[sKey];
        },
        set : function (value) {
          data[sKey] = value;
          this.dispatchEvent(symbols.Model.change, sKey, value);
          this.dispatchEvent(sKey, value);
        }
      });
    }
  }

  /**
   *  @class
   *  The ModelView class is the view window that sits atop of a Model and is
   *  in change of the mapping between it and the DOM.
   */
  class ModelView extends HTMLElement {

    /**
     *
     */
    get properties() {
      return {
        Model,
        template : null
      };
    }

    /**
     *
     */
    get ties() {
      return [];
    }

    /**
     *
     */
    createdCallback() {
      let template = documentReference.querySelector(this.properties.template);
      let clone = documentReference.importNode(template.content, true);
      this.createShadowRoot().appendChild(clone);
      this.data = new this.properties.Model();
    }

    /**
     *
     */
    attachedCallback() {
      this.ties.map(tie => new Tie(tie));
      for (let key in this.data) {
        this.data.dispatchEvent(key, this.data[key]);
      }
    }

    /**
     *
     */
    select(sElement, oOptions) {
      return viewMethods.select.call(this, sElement, oOptions);
    }

    /**
     *
     */
    static create(oModel) {
      let ModelView = new this.DOMConstructor();
      if (oModel) { ModelView.data = oModel; }

      return ModelView;
    }

    /**
     *
     */
    static register(sTag) {
      return viewMethods.register.call(this, sTag);
    }

  }

  /**
   *
   */
  class Collection extends Event {

    /**
     *
     */
    get properties() {
      return { Model };
    }

    /**
     *
     */
    get length() {
      return this[symbols.Collection.data].length;
    }

    /**
     *
     */
    constructor(aData) {
      super();
      this[symbols.Collection.data] = aData || [];
      this[symbols.Collection.addTriggers]();
      this.addEventListener(symbols.Collection.length, () => {
        this[symbols.Collection.addTriggers]();
      });

    }

    /**
     *
     */
    [symbols.Collection.addTriggers]() {
      let data = this[symbols.Collection.data];
      for (let index in data) {
        data[index].addEventListener(symbols.Model.change, (key, value) => {
          this.dispatchEvent(symbols.Collection.change, index, key, value);
        });
        Object.defineProperty(this, index, {
          configurable : true,
          enumerable : true,
          get : function () {
            return data[index];
          },
          set : function (value) {
            data[index] = value;
            this.dispatchEvent(index, value);
          }
        });
      }
    }

    /**
     *
     */
    fetch(URL) {
      return this::dataMethods.fetch(URL);
    }

    /**
     *
     */
    get() {
      return this[symbols.Collection.data];
    }

    /**
     *
     */
    set(aData) {
      this[symbols.Collection.data] = aData;
      this.dispatchEvent(symbols.Collection.length);
    }

    *[Symbol.iterator]() {
      let data = this[symbols.Collection.data];
      for (let model of data) {
        yield model;
      }
    }

    /**
     *
     */
    pop() {
      let popped = this.get().pop();
      this.dispatchEvent(symbols.Collection.length);
      return popped;
    }

    /**
     *
     */
    push(...aElements) {
      let length = this.get().push(...aElements);
      this.dispatchEvent(symbols.Collection.length);
      return length;
    }

    /**
     *
     */
    shift() {
      let shifted = this.get().shift();
      this.dispatchEvent(symbols.Collection.length);
      return shifted;
    }

    /**
     *
     */
    unshift(...aElements) {
      let length = this.get().unshift(...aElements);
      this.dispatchEvent(symbols.Collection.length);
      return length;
    }

    /**
     *
     */
    splice(iStart, iDelete, ...aItems) {
      let removed = this.get().splice(iStart, iDelete, ...aItems);
      this.dispatchEvent(symbols.Collection.length);
      return removed;
    }

  }

  /**
   *
   */
  class CollectionView extends HTMLElement {

    /**
     *
     */
    get properties() {
      return {
        Collection, ModelView,
        template : null,
        insert : null
      };
    }

    /**
     *
     */
    get ties() {
      return [];
    }

    /**
     *
     */
    get insertionNode() {
      let insert = this.properties.insert;
      if ('appendChild' in insert) {
        return insert;
      } else {
        return this.select(insert, { shadow : true });
      }
    }

    /**
     *
     */
    createdCallback() {
      let template = documentReference.querySelector(this.properties.template);
      let clone = documentReference.importNode(template.content, true);
      this.createShadowRoot().appendChild(clone);
      this.data = new this.properties.Collection();
      this.data.addEventListener(symbols.Collection.length, ::this.render);
      this.ties.map(tie => new Tie(tie));
    }

    /**
     *  @instance
     *  This method is called each time the length of the collection changes.
     *  It empties the instertionNode specified in the properties (by default
     *  it will be the templates <content> tag). It can however be any Object
     *  that implements the appendChild() DOM method.
     */
    render() {
      let ModelView = this.properties.ModelView;
      let insertionNode = this.insertionNode;
      while (insertionNode.firstChild) {
        insertionNode.removeChild(insertionNode.lastChild);
      }
      for (let model of this.data) {
        let node = ModelView.create(model);
        this.insertionNode.appendChild(node);
      }
    }

    /**
     *  @instance
     *  Borrows the viewMethods.select method and binds it to the correct scope.
     *  @returns {HTMLElement | null}
     */
    select(sElement, oOptions) {
      return this::viewMethods.select(sElement, oOptions);
    }

    /**
     *  @static
     *  Returns a freshly initialised Node that can be added to the document in
     *  using standard DOM API's
     *  @example
     *  // Adds an empty CollectionView to the body
     *  document.body.appendChild(CollectionView.create());
     *  @returns {Node} A new CollectionView node
     */
    static create() {
      return new this.DOMConstructor();
    }

    /**
     *  @static
     *  Simply a proxy to bind the viewMethods.register function to the
     *  CollectionView scope
     *  @returns {DOMConstructor} The constructor used to initialise Nodes
     */
    static register(sTag) {
      return this::viewMethods.register(sTag);
    }

  }

  return { Event, Tie, Model, ModelView, Collection, CollectionView, symbols };

})();
