import falcon
import uuid
import redis
import simplejson as json
from db import Answered


safe_int = lambda i: int(i) if i else i


def check_or_set_uid(req, resp, resource, params):
    uid = req.cookies.get('uid')
    if not uid:
        uid = uuid.uuid4().hex[:8]
        resp.set_cookie("uid", uid, max_age=600, path='/rest', secure=False, http_only=False)
    params['uid'] = uid


@falcon.before(check_or_set_uid)
class GameResource(object):
    def __init__(self, redis_client):
        self.redis = redis_client

    def on_post(self, req, resp, game_id, uid):
        dispatch_map = {
            'start': self.game_start,
            'finish': self.game_finish
        }
        operation = req.get_param('operation', required=True).lower()
        method = dispatch_map.get(operation)
        if not method:
            resp.status = falcon.HTTP_400
        else:
            resp.body = method(req, game_id, uid)

    def game_start(self, req, game_id, uid):
        p = self.redis.pipeline()
        p.sadd('game:%s:users' % game_id, uid)
        p.incr('game:%s:total' % game_id)
        is_new, total = p.execute()
        return json.dumps({
            'message': 'Game %s for user %s started' % (game_id, uid),
            'is_new': is_new,
            'total': total
        })

    def game_finish(self, req, game_id, uid):
        score = req.get_param_as_int('score', required=True)

        # redis key names
        game_scores_key = 'game:%s:scores' % game_id
        user_best_score_key = 'game:%s:user:%s:best:score' % (game_id, uid)
        user_best_rank_key = 'game:%s:user:%s:best:rank' % (game_id, uid)

        p = self.redis.pipeline()
        p.zadd(game_scores_key, score, score)
        p.zrevrank(game_scores_key, score)
        p.get(user_best_score_key)
        p.get(user_best_rank_key)

        # cast results to int
        rank, best, best_rank = map(safe_int, p.execute()[1:])

        # update best score and rank
        if best is None or score > best:
            best = score
            p.set(user_best_score_key, score)
        if best_rank is None or rank < best_rank:
            best_rank = rank
            p.set(user_best_rank_key, rank)
        p.execute()

        # rank is 0-based
        rank += 1
        best_rank += 1

        return json.dumps({
            'message': 'Game %s for user %s finished' % (game_id, uid),
            'score': score,
            'rank': rank,
            'best': best,
            'best_rank': best_rank
        })


@falcon.before(check_or_set_uid)
class AnsweredResource(object):
    def on_post(self, req, resp, game_id, question_id, uid):
        selected = req.get_param_as_list('selected', required=True)
        Answered.create(question=question_id, user=uid, selected=','.join(selected), game=game_id)
        resp.body = 'User %s selected %s for Question %s' % (uid, ','.join(selected), question_id)


api = falcon.API()

r = redis.StrictRedis()

api.add_route('/rest/game/{game_id}', GameResource(r))
api.add_route('/rest/game/{game_id}/question/{question_id}/answered', AnsweredResource())