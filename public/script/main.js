
var app = (function($, _, Backbone){
  app = {};

  app.QUESTION_TYPE = {
    MULTI: 'multi',
    SINGLE: 'single'
  };

  app.QUIZ_TYPE = {
    ORDINARY: 'ordinary',
    TIME_LIMIT: 'time_limit',
    CHALLENGE: 'challenge'
  };

  app.Option = Backbone.Model.extend({});

  app.Question = Backbone.Model.extend({});

  app.Answered = Backbone.Model.extend({});

  app.QuestionCollection = Backbone.Collection.extend({
    model: app.Question
  });

  app.OptionCollection = Backbone.Collection.extend({
    model: app.Option
  });

  app.AnsweredCollection = Backbone.Collection.extend({
    model: app.Answered
  });

  // app.Quiz = Backbone.Model.extend({
  //   initialize: function(attributes) {
  //     this.set('questions', new app.QuestionCollection());
  //     this.set('answered', new app.AnsweredCollection());
  //   },
  //   hasStarted: function(now){
  //     var now = now || new Date();
  //     return this.startAt > now;
  //   },
  //   hasEnded: function(now){
  //     var now = now || new Date();
  //     return this.endAt < now;
  //   }
  // });

  app.QuestionView = Backbone.View.extend({
    tagName: 'form',
    className: 'question',
    template: _.template($('#tpl_question').html()),
    initialize: function(){
      var optionData = this.model.get('options');
      var questionOptions =  new app.OptionCollection(optionData);
      this.model.set('options', questionOptions);
      this.listenTo(questionOptions, 'change:checked', this.toggleChecked);
    },
    render: function(){
      this.$el.html(this.template(this.model.toJSON()));
      this.renderAllOptions();
      return this;
    },
    renderOption: function(model){
      if(this.model.get('type') == 'multi'){
        var ViewClass = app.MultiSelectionView
      } else {
        var ViewClass = app.SingleSelectionView
      }
      var view = new ViewClass({model:model});
      this.$('.option-list').append(view.render().el);
    },
    renderAllOptions: function(){
      var questionOptions = _.shuffle(this.model.get('options').models);
      _.each(questionOptions, this.renderOption, this);
      return this;
    },
    toggleChecked: function(model){
      if(this.model.get('type') == 'multi'){
        this.checkedOptions = _.pluck(
          this.model.get('options').filter('checked'), 'id'
        );
      } else {
        this.checkedOptions = [ model.id ];
      }
      console.log(this.checkedOptions);
    }
  });

  app.OptionView = Backbone.View.extend({
    tagName: 'div',
    className: 'question-option',
    events: {
      'change input': 'toggle'
    },
    render: function(){
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    toggle: function(){
      console.log('toggle event triggered');
      var checked = this.model.get('checked');
      this.model.set('checked', !checked);
      console.log(this.model.toJSON());
    },
  });

  app.SingleSelectionView = app.OptionView.extend({
    template: _.template($('#tpl_option_single').html())
  });

  app.MultiSelectionView = app.OptionView.extend({
    template: _.template($('#tpl_option_multi').html())
  });

  app.WelcomeView = Backbone.View.extend({
    tagName: 'div',
    className: 'welcome',
    template: _.template($('#tpl_welcome').html()),
    initialize: function(){
      this.content = options.content;
      this.infoFields = options.infoFields;
    },
    render: function(){
      this.$el.html(this.template({
        content: this.content,
        infoFields: this.infoFields
      }));
      return this;
    }
  });

  app.RejectionView = Backbone.View.extend({
    render: function(){
      this.$el.html(this.template());
      return this;
    }
  });

  app.RejectionTooEarlyView = app.RejectionView.extend({
    template: _.template($('#tpl_too_early').html())
  });

  app.RejectionTooLateView = app.RejectionView.extend({
    template: _.template($('#tpl_too_late').html())
  });

  app.RejectionNoMoreChanceView = app.RejectionView.extend({
    template: _.template($('#tpl_no_more_chance').html())
  });

  app.ApplicationView = Backbone.View.extend({
    el: $('#app_container'),
    dataRoot: '/data/',
    initialize: function(options){
      this.game_code = options.game_code;
      this.gameDataRoot = this.dataRoot + this.game_code + '/';
      this.quizConfig = options.config;
      console.log(this.quizConfig);
    },
    loadView: function(view){
      this.view && (this.view.close ? this.view.close() : this.view.remove());
      this.view = view;
      this.$el.append(this.view.render().el);
    },
    // loadConfig: function(){
    //   var configUrl = this.gameDataRoot + 'config.json';
    //   return $.getJSON(configUrl).then(_.bind(function(data){
    //     this.quizConfig = data;
    //     this.quizConfig.start_at = new Date(this.quizConfig.start_at);
    //     this.quizConfig.end_at = new Date(this.quizConfig.end_at);
    //   }, this));
    // },
    renderWelcome: function(){
      this.$el.html(this.quiz.get('welcome'));
    },
    renderQuestion: function(question){
      this.currentQuestion = question;
      var questionView = new app.QuestionView({model: question});
      this.$el.append(questionView.render().el);
    }
  });

  return app;
})($, _, Backbone);
