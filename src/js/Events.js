/*
  Custom Event Object

  Emit custom events. Runs like a class but public to the window.
*/
globalThis.Events = {
  eventCache_: new Map(),

  /**
   * emit the custom event and run their listeners
   *
   * @param {String} type name ID of the event
   * @param {Any} optData data for the event if needed
   */
  emit: function (type, optData) {
    const funcs = this.eventCache_.get(String(type));
    if (funcs) funcs.forEach((func) => func(optData));
  },

  /**
   * Add a listener to a custom event. Runs every time the event emits.
   *
   * @param {String} type name ID of the event
   * @param {Function} func function that runs when emitted
   */
  on: function (type, func) {
    if (typeof func !== "function") {
      throw new Error("Events.on -- Parameter 2 must be a function!");
    }

    if (this.eventCache_.has(String(type))) {
      this.eventCache_.get(String(type)).push(func);
    } else {
      this.eventCache_.set(String(type), [func]);
    }
  },

  /**
   * Add a listener to a custom event. Runs one time.
   *
   * @param {String} type name ID of the event
   * @param {Function} func function that runs when emitted
   */
  once: function (type, func) {
    if (typeof func !== "function") {
      throw new Error("Events.on -- Parameter 2 must be a function!");
    }

    const wrapper = (data) => {
      // Remove this listener after it fires
      this.off(String(type), wrapper);
      func(data);
    };

    this.on(String(type), wrapper);
  },

  /**
   * Remove a listener(s) from a custom event.
   * To remove all listeners, dont add the second parameter.
   *
   * @param {String} type name ID of the event
   * @param {Function} optFunc specific function to remove
   */
  off: function (type, optFunc) {
    type = String(type);
    const funcs = this.eventCache_.get(type);
    if (!funcs) return;

    if (typeof optFunc === "function") {
      const updated = funcs.filter((f) => f !== optFunc);
      this.eventCache_.set(type, updated);
    } else {
      // No function provided, remove all listeners
      this.eventCache_.delete(type);
    }
  },
};
