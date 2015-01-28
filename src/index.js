var fs = require('fs')
var _ = require('lodash')
var utils = require('./utils')
var util = require('util')

// Modifies chain methods to save on value() call
function saveOnValue(db, chain, save) {
  chain.value = _.flow(chain.value, function(value) {
    save()
    return value
  })

  for (var prop in chain) {
    if (_.isFunction(chain[prop]) && prop !== 'value') {
      chain[prop] = _.flow(chain[prop], function(newChain) {
        saveOnValue(db, newChain, save)
        return newChain
      })
    }
  }
}

function low(file, options) {
  var options = _.assign({
    autosave: true,
    async: true
  }, options)

  function db(key) {
    var array = db.object[key] = db.object[key] || []
    var chain = _.chain(array)

    if (file && options.autosave) {
      var save = function() {
        options.async ? db.save() : db.saveSync()
      }

      saveOnValue(db, chain, save)
    }

    return chain
  }

  db.save = function(f) {
    f = f ? f : file
    utils.saveAsync(f, low.stringify(db.object))
  }

  db.saveSync = function(f) {
    f = f ? f : file
    utils.saveSync(f, low.stringify(db.object))
  }
  
  db.object = utils.getObject(file, low.parse)

  return db
}

low.mixin = function(arg) {
  _.mixin(arg)
}

low.stringify = function(obj) {
  return JSON.stringify(obj, null, 2)
}

low.parse = function(str) {
  return JSON.parse(str)
}

module.exports = low
