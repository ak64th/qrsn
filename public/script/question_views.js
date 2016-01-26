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
      this.startTimer();
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
    toggleChecked: function(model){
      if(this.model.get('type') == app.QUESTION_TYPE.MULTI){
        this.selectedOptions = this.model.get('options').filter('checked');
      } else {
        this.selectedOptions = [ model ];
      }
    },
    onSubmit: function(){
      if (!_.isEmpty(this.selectedOptions)){
        this.timer && clearInterval(this.timer);
        this.timer = null;
        var answered = this.createAnswered();
        this.trigger('answered', answered);
      }
    },
    onTimeout: function(){
      this.timer && clearInterval(this.timer);
      this.timer = null;
      var answered = this.createAnswered();
      answered.set('timeout', true);
      this.trigger('answered', answered);
    },
    createAnswered: function(){
      var answered = new app.Answered(this.model.toJSON());
      answered.set('selected', this.selectedOptions || []);
    },
    startTimer: function(){
      if (!this.timeLimit || this.timeLimit < 1) return null;
      var counter = 0, timeLimit = this.timeLimit;
      var timer = setInterval(_.bind(function(){
        counter++;
        console.log("counter #", counter, timeLimit);
        if (counter >= timeLimit) this.onTimeout();
        this.$('.timer').html( timeLimit - counter );
      }, this), 1000);
      return timer;
    },
    close: function(){
      this.timer && clearInterval(this.timer);
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
