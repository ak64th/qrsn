
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

  app.ModalView = Backbone.View.extend({
    tagName: 'div',
    className: 'modal_container',
    template: _.template($('#tpl_modal').html()),
    events: {
      'click .submit': 'close'
    },
    initialize: function(options){
      this.options = options;
      this.callback = options.callback;
    },
    render: function(){
      this.$el.html(this.template(this.options));
      return this;
    },
    close: function(){
      console.log('Close');
      _.isFunction(this.callback) && this.callback();
      this.remove();
    }
  });

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

  app.QuestionView = Backbone.View.extend({
    tagName: 'div',
    className: 'question',
    template: _.template($('#tpl_question').html()),
    events: {
      'click .submit': 'onSubmit'
    },
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
      this.$('.option_list').append(view.render().el);
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
    },
    onSubmit: function(){
      var answer = this.model.get('answer');
      var selected = this.checkedOptions;
      var isCorrect = this.checkAnswer(answer, selected);
      this.trigger('finishQuestion', answer, selected, isCorrect);
    },
    checkAnswer: function(answer, selected){
      return answer && selected && answer.length === selected.length && _.difference(answer, selecselectedted).length === 0;
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

  app.WelcomeView = Backbone.View.extend({
    tagName: 'div',
    className: 'welcome',
    template: _.template($('#tpl_welcome').html()),
    events: {
      'click .submit': 'onSubmit',
    },
    initialize: function(options){
      this.content = options.content;
      this.infoFields = options.infoFields;
      this.quizId = options.quizId;
    },
    render: function(){
      this.$el.html(this.template({
        content: this.content,
        infoFields: this.infoFields
      }));
      return this;
    },
    onSubmit: function(e){
      var field_keys = _.unzip(this.infoFields)[0];
      var validated = false;
      var field_data = [];
      if (field_keys.length){
        validated = _(this.$('input')).chain()
        .filter(function(input){
          return _(field_keys).indexOf(input.name) >= 0;
        })
        .every(function(input){
          if (input.value.length > 0){
            field_data.push([input.name, input.value])
            localStorage.setItem(input.name, input.value);
            return true;
          }
          return false;
        })
        .value();
      } else {
        validated = true;
      }
      if(validated){
        this.trigger('startQuiz', field_data);
      } else {

      }
    }
  });



  app.ApplicationView = Backbone.View.extend({
    el: $('#app_container'),
    dataRoot: '/data/',
    apiRoot: '/rest/',
    initialize: function(options){
      this.game_code = options.game_code;
      this.gameDataRoot = this.dataRoot + this.game_code + '/';
      this.quizConfig = options.config;
    },
    loadView: function(view){
      this.view && (this.view.close ? this.view.close() : this.view.remove());
      this.view = view;
      this.$el.append(this.view.render().el);
    },
    prepareQuiz: function(){
      console.log(this.quizConfig);
      this.questions = new app.QuestionCollection();
      this.answered = new app.AnsweredCollection();
      var view = new app.WelcomeView({
        content: this.quizConfig.welcome,
        infoFields: this.quizConfig.info_fields,
        quizId: this.quizConfig.id
      });
      this.listenToOnce(view, 'startQuiz', this.startQuiz);
      this.loadView(view);
    },
    startQuiz: function(args){
      console.log(args);
    },
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
