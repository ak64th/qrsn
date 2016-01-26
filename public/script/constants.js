(function(root){
  app = root.app || {};

  app.QUESTION_TYPE = {
    MULTI: 'multi',
    SINGLE: 'single'
  };

  app.QUIZ_TYPE = {
    ORDINARY: 'ordinary',
    TIME_LIMIT: 'time_limit',
    CHALLENGE: 'challenge'
  };

  app.DOWNLOAD_TIMEOUT = 3000;

  root.app = app;
  return app;
})(window);
