import logging
from webassets import Environment, Bundle
from webassets.script import CommandLineEnvironment

assets_env = Environment(directory='../public', url='/public')
js = Bundle('bower_components/jquery/dist/jquery.min.js',
            'bower_components/underscore/underscore-min.js',
            'bower_components/backbone/backbone-min.js',
            Bundle(  # uncompressed files
            'script/constants.js',
            'script/models.js',
            'script/modal_view.js',
            'script/pre_quiz_views.js',
            'script/question_views.js',
            'script/rank_view.js',
            'script/quiz_views.js',
            'script/main.js',
            filters='jsmin'), output='script/packed.js')
assets_env.register('js_all', js)

# Setup a logger
log = logging.getLogger('webassets')
log.addHandler(logging.StreamHandler())
log.setLevel(logging.DEBUG)

cmdenv = CommandLineEnvironment(assets_env, log)
cmdenv.watch()