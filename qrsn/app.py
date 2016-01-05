import falcon
from db import PeeweeConnectionMiddleware


class GamesResource(object):
    def __init__(self, db):
        self.db = db

    def on_get(self, req, resp):

        resp.status = falcon.HTTP_200  # This is the default status
        resp.body = ('\nTwo things awe me most, the starry sky '
                     'above me and the moral law within me.\n'
                     '\n'
                     '    ~ Immanuel Kant\n\n')

api = application = falcon.API(middleware=[
    PeeweeConnectionMiddleware(),
])

app.add_route('/games', things = GamesResource())