from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

from sqlalchemy.sql import and_ 
from sqlalchemy.orm import foreign 

db = SQLAlchemy()

# Users Model
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(255), nullable=False, unique=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    first_name = db.Column(db.String(255))
    last_name = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Sections Model
class Section(db.Model):
    __tablename__ = 'sections'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    section_type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    listening_audios = db.relationship('ListeningAudio', backref='section', lazy=True)
    reading_passages = db.relationship('ReadingPassage', backref='section', lazy=True)
    speaking_tasks = db.relationship('SpeakingTask', backref='section', lazy=True)
    writing_tasks = db.relationship('WritingTask', backref='section', lazy=True)

# Listening Audios Model
class ListeningAudio(db.Model):
    __tablename__ = 'listening_audios'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    audio_url = db.Column(db.String(255), nullable=False)
    photo_url = db.Column(db.String(255))

# Reading Passages Model
class ReadingPassage(db.Model):
    __tablename__ = 'reading_passages'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)

# Questions Model
class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    section_type = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    listening_audio_id = db.Column(db.Integer, db.ForeignKey('listening_audios.id'))
    reading_passage_id = db.Column(db.Integer, db.ForeignKey('reading_passages.id'))
    paragraph_index = db.Column(db.Integer, nullable=True)


    listening_audio = db.relationship('ListeningAudio', backref='questions')
    reading_passage = db.relationship('ReadingPassage', backref='questions')
    options = db.relationship('Option', backref='question', lazy=True)
    table_rows = db.relationship('TableQuestionRow', backref='question', lazy=True)
    table_columns = db.relationship('TableQuestionColumn', backref='question', lazy=True)
    correct_answers = db.relationship('CorrectAnswer', backref='question', lazy=True)
    question_audios = db.relationship('QuestionAudio', backref='question', lazy=True)

# Options Model
class Option(db.Model):
    __tablename__ = 'options'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    option_text = db.Column(db.Text, nullable=False)

# Table Question Rows Model
class TableQuestionRow(db.Model):
    __tablename__ = 'table_question_rows'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    row_label = db.Column(db.Text, nullable=False)

# Table Question Columns Model
class TableQuestionColumn(db.Model):
    __tablename__ = 'table_question_columns'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    column_label = db.Column(db.Text, nullable=False)

# Question Audio Model
class QuestionAudio(db.Model):
    __tablename__ = 'question_audios'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    audio_url = db.Column(db.String(255), nullable=False)

# Correct Answers Model
class CorrectAnswer(db.Model):
    __tablename__ = 'correct_answers'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    table_row_id = db.Column(db.Integer, db.ForeignKey('table_question_rows.id'))
    table_column_id = db.Column(db.Integer, db.ForeignKey('table_question_columns.id'))
    option_id = db.Column(db.Integer, db.ForeignKey('options.id'))

    table_row = db.relationship('TableQuestionRow')
    table_column = db.relationship('TableQuestionColumn')
    option = db.relationship('Option')

# Speaking Tasks Model
class SpeakingTask(db.Model):
    __tablename__ = 'speaking_tasks'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'), nullable=False)
    task_number = db.Column(db.Integer, nullable=False)
    passage = db.Column(db.Text)
    prompt = db.Column(db.Text, nullable=False)
    audio_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    responses = db.relationship('SpeakingResponse', backref='task', lazy='selectin')

# Writing Tasks Model
class WritingTask(db.Model):
    __tablename__ = 'writing_tasks'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'), nullable=False)
    task_number = db.Column(db.Integer, nullable=False)
    passage = db.Column(db.Text, nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    audio_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    responses = db.relationship('WritingResponse', backref='task', lazy='selectin')

# Speaking Responses Model
class SpeakingResponse(db.Model):
    __tablename__ = 'speaking_responses'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('speaking_tasks.id'), nullable=False)
    audio_url = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    user = db.relationship('User', backref='speaking_responses')
    # task = db.relationship('SpeakingTask', backref='speaking_responses')

    scores = db.relationship(
        'Score',
        primaryjoin=lambda: and_(
            foreign(Score.response_id) == SpeakingResponse.id,
            Score.response_type == 'speaking'
        ),
        backref='speaking_response', # Add specific backref
        cascade="all, delete-orphan",
        lazy='selectin'
    )

# Writing Responses Model
class WritingResponse(db.Model):
    __tablename__ = 'writing_responses'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('writing_tasks.id'), nullable=False)
    response_text = db.Column(db.Text, nullable=False)
    word_count = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    user = db.relationship('User', backref='writing_responses')
    # task = db.relationship('WritingTask', backref='writing_responses') # Changed backref slightly

    scores = db.relationship(
        'Score',
        primaryjoin=lambda: and_(
            foreign(Score.response_id) == WritingResponse.id,
            Score.response_type == 'writing'
        ),
        backref='writing_response', # Add specific backref
        cascade="all, delete-orphan",
        lazy='selectin'
    )

# Scores Model
user_answer_score_assoc = db.Table('user_answer_score_assoc',
    db.Column('user_answer_id', db.Integer, db.ForeignKey('user_answers.id'), primary_key=True),
    db.Column('score_id', db.Integer, db.ForeignKey('scores.id'), primary_key=True)
)


class Score(db.Model):
    __tablename__ = 'scores'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # Keep these generic for S/W
    response_id = db.Column(db.Integer, nullable=True) # ID from SpeakingResponse or WritingResponse
    response_type = db.Column(db.String(50), nullable=True) # 'speaking' or 'writing'
    # Add specific FK for R/L
    user_answer_id = db.Column(db.Integer, db.ForeignKey('user_answers.id'), nullable=True)
    # Score and Feedback details
    score = db.Column(db.Numeric(5, 2), nullable=True) # Nullable score
    feedback = db.Column(db.Text, nullable=True) # Nullable feedback
    scored_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp()) # Add updated_at

    scorer = db.relationship('User', backref='scores_given') # Adjusted backref slightly

    # Relationship back to UserAnswer (Optional but can be useful)
    # Use secondary table for M-N potential, although likely 1-1 in practice here
    user_answers = db.relationship('UserAnswer', secondary=user_answer_score_assoc, backref='scores')

    # Add constraints to ensure only one type of response link is used
    __table_args__ = (
        db.CheckConstraint(
            'num_nonnulls(response_id, user_answer_id) = 1',
            name='score_response_link_check'
        ),
         db.CheckConstraint(
            "(response_type IN ('speaking', 'writing') AND response_id IS NOT NULL AND user_answer_id IS NULL) OR "
            "(response_type IN ('reading', 'listening') AND user_answer_id IS NOT NULL AND response_id IS NULL AND response_type IS NOT NULL)",
            name='score_response_type_check'
        ),
    )


# Modify UserAnswer to link to Score via secondary table
class UserAnswer(db.Model):
    __tablename__ = 'user_answers'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    table_row_id = db.Column(db.Integer, db.ForeignKey('table_question_rows.id'))
    table_column_id = db.Column(db.Integer, db.ForeignKey('table_question_columns.id'))
    option_id = db.Column(db.Integer, db.ForeignKey('options.id'))

    user = db.relationship('User', backref='answers')
    question = db.relationship('Question', backref='user_answers')
    table_row = db.relationship('TableQuestionRow')
    table_column = db.relationship('TableQuestionColumn')
    option = db.relationship('Option')
