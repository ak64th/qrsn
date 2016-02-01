(function(root, _, Backbone){
  app = root.app || {};

  app.QuestionView = Backbone.View.extend({
    tagName: 'div',
    className: 'question',
    template: _.template($('#tpl_question').html()),
    events: {
      'click .submit': 'onSubmit'
    },
    initialize: function(options){
      // set code(A,B,C...) for each options and build a collection
      var optionData = this.model.get('options');
      var questionOptions =  new app.OptionCollection(optionData);
      questionOptions.each(function(model, index){
        model.set('code' , String.fromCharCode(65 + index));
      });
      this.model.set('options', questionOptions);
      this.listenTo(questionOptions, 'change:checked', this.toggleChecked);
      this.optionViews = [];
      this.timeLimit = options.timeLimit || 0;
    },
    render: function(){
      var data = this.model.toJSON();
      data.timeLimit = this.timeLimit;
      this.$el.html(this.template(data));
      this.renderAllOptions();
      // this.startTimer();
      return this;
    },
    renderOption: function(model){
      if(this.model.get('type') == app.QUESTION_TYPE.MULTI){
        var ViewClass = app.MultiSelectionView
      } else {
        var ViewClass = app.SingleSelectionView
      }
      var view = new ViewClass({model:model});
      this.optionViews.push(view);
      this.$('.option_list').append(view.render().el);
    },
    renderAllOptions: function(){
      var questionOptions = _.shuffle(this.model.get('options').models);
      _.each(questionOptions, this.renderOption, this);
      return this;
    },
    toggleChecked: function(checked){
      if(this.model.get('type') == app.QUESTION_TYPE.MULTI){
        this.model.set('selected', this.model.get('options').filter('checked'))
      } else {
        this.model.set('selected', [ checked ])
      }
    },
    onSubmit: function(){
      if (!_.isEmpty(this.model.get('selected'))){
        this.clearTimer();
        this.finish();
      }
    },
    onTimeout: function(){
      this.clearTimer();
      this.model.set('timeout', true);
      this.finish();
    },
    finish: function(){
      this.model.set('answered', true);
      this.trigger('finish', this.model);
    },
    startTimer: function(){
      if (!this.timeLimit || this.timeLimit < 1) return null;
      var counter = 0, timeLimit = this.timeLimit;
      var callback = function(){
        remaining = timeLimit - ++counter;
        // console.log("counter #", counter, timeLimit);
        this.$('.timer').html( remaining );
        if (remaining < 1) this.onTimeout();
      };
      this.timer = setInterval(_.bind(callback, this), 1000);
    },
    clearTimer: function(){
      this.timer && clearInterval(this.timer);
      this.timer = null;
    },
    close: function(){
      this.clearTimer();
      _.each(this.optionViews, function(view){ view.remove(); });
      this.remove();
    }
  });

  app.OptionView = Backbone.View.extend({
    tagName: 'div',
    className: 'question_option',
    events: {
      'change input': 'toggle'
    },
    render: function(){
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    toggle: function(){
      var checked = this.model.get('checked');
      this.model.set('checked', !checked);
    },
  });

  app.SingleSelectionView = app.OptionView.extend({
    template: _.template($('#tpl_option_single').html())
  });

  app.MultiSelectionView = app.OptionView.extend({
    template: _.template($('#tpl_option_multi').html())
  });

  root.app = app;
  return app;
})(this, _, Backbone);
