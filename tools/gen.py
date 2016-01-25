import argparse
import json
import random


class AutoIncrementId(object):
    _id_counter = 0

    @classmethod
    def new_id(cls):
        cls._id_counter += 1
        return cls._id_counter


class Question(AutoIncrementId):
    def __init__(self, question_id=None, content=None, question_type='single', options=None, answer=None):
        self.id = question_id if question_id else self.new_id()
        self.content = content if content else 'Question %d' % self.id
        self.type = question_type
        self.options = list(options) if options else []
        self.answer = list(answer) if answer else []

    def add_option(self, option, correct=False):
        self.options.append(option)
        if correct:
            if self.type == 'multi':
                self.answer.append(option.id)
            else:
                self.answer = [option.id]

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'type': self.type,
            'options': [option.to_dict() for option in self.options],
            'answer': self.answer
        }


class Option(AutoIncrementId):
    def __init__(self, option_id=None, content=None):
        self.id = option_id if option_id else self.new_id()
        self.content = content if content else 'Option %d' % self.id

    def to_dict(self):
        return {'id': self.id, 'content': self.content}


def generate_question(question_type, option_min, option_max):
    option_count = option_min if option_min is option_max else random.randint(option_min, option_max)
    q = Question(question_type=question_type)
    for _ in range(option_count):
        q.add_option(Option(), random.choice((True, False)))
    if not q.answer:
        q.answer = [q.options[0].id]
    return q


QUESTIONS_PER_FILE = 20
QUESTION_TYPES = ('single', 'multi')

parser = argparse.ArgumentParser(description='Generate some random questions and save into json files.')

question_type_group = parser.add_argument_group('question count per type')

for t in QUESTION_TYPES:
    question_type_group.add_argument('-' + t[0].upper(), '--' + t, type=int, default=0)

parser.add_argument('-O', '--option', metavar='COUNT', nargs=2, type=int, default=[3, 5],
                    help='min and max number of options')
parser.add_argument('total', type=int, metavar='N', help='total number of questions', nargs='?', default=0)

args = parser.parse_args()

_count = {t: getattr(args, t) for t in QUESTION_TYPES if getattr(args, t) > 0}
_total = sum(_count.values())
if args.total < _total:
    args.total = _total

if args.total < 1:
    raise ValueError("total question number should be larger than 1")

_min, _max = args.option
if _max < 1 or _min > _max:
    raise ValueError("option number not allowed")

per_file = QUESTIONS_PER_FILE


def dump_questions(filename, questions):
    with open(filename, 'w') as f:
        data = {'objects': [q.to_dict() for q in questions]}
        json.dump(data, f, indent=2, separators=(',', ': '))


_fc = 0
_question_files = {}
for t, count in _count.items():
    _question_files.setdefault(t, [])
    while count > 0:
        n = count if count < per_file else per_file
        count -= n
        _fc += 1
        filename = "{}.json".format(_fc)
        questions = [generate_question(t, _min, _max) for _ in range(n)]
        dump_questions(filename, questions)
        _question_files[t].append(filename)

question_files = json.dumps(_question_files, indent=2, separators=(',', ': '))
print(question_files)
