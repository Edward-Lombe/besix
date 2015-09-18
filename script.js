import Besix from './besix';

class Item extends Besix.Model {
  get defaults() {
    return {
      data : null
    };
  }
}

class ItemView extends Besix.ModelView {
  get properties() {
    return {
      Model : Item,
      template : '#bsx-item'
    };
  }

  get ties() {
    let pre = this.select('#data', { shadow : true });
    return [
      [[this.data, 'data'], [this.data, 'data'], [([a]) => a], [pre, 'textContent']]
    ];
  }

}

class List extends Besix.Collection {
  get properties() {
    return {
      Model : Item
    };
  }

  constructor() {
    super();
    this.populateData();
    // setInterval(this.populateData.bind(this), 1000);
  }

  populateData() {
    const randomData = [];
    const limit = Math.floor(Math.random() * 10)
    for (let i = 0; i < limit; i++) {
      // randomData.push({ data : Math.random().toString(36).substr(2, 5) });
      randomData.push({ data : ''+i });
    }
    this.set(randomData.map(item => new this.properties.Model(item)));
  }

}

class ListView extends Besix.CollectionView {
  get properties() {
    return {
      ModelView : ItemView,
      Collection : List,
      template : '#bsx-list',
      insert : this
    };
  }

  get ties() {
    return [
      [[this, 'click'], [], [::this.data.populateData], []]
    ]
  }

}

let a = [];

ItemView.register('bsx-item');
ListView.register('bsx-list');
