from flask import Flask, request, jsonify, send_file, abort
from werkzeug.utils import secure_filename
import datetime
import jwt
from functools import wraps
import os
import json
import uuid

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.orm import joinedload # For eager loading relationships

from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:5173", "http://localhost:8080"],  # Match your React frontend origin
    "methods": ["GET", "POST", "OPTIONS"],  # Include OPTIONS for preflight
    "allow_headers": ["Content-Type", "Authorization"]  # Allow JSON headers
}})

# Load configuration from environment variables
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.environ.get('SQLALCHEMY_TRACK_MODIFICATIONS')
app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
# too early to include these (deal with the error it brings)
# app.config['MAX_CONTENT_LENGTH'] = os.environ.get('MAX_CONTENT_LENGTH')
# app.config['SEND_FILE_MAX_AGE_DEFAULT'] = os.environ.get('SEND_FILE_MAX_AGE_DEFAULT')



# Ensure upload folder and subfolders exist
folders = ['listening_audios', 'listening_photos', 'question_audios', 'speaking_audios', 'writing_audios']
for folder in folders:
    path = os.path.join(app.config['UPLOAD_FOLDER'], folder)
    if not os.path.exists(path):
        os.makedirs(path)


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        try:
            token = token.split(" ")[1]  # Expecting 'Bearer <token>'
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            if not payload.get('role') or payload.get('role') != 'admin' :
                return jsonify({'error': 'Admin privileges required'}), 403
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required_with_id(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        try:
            token = token.split(" ")[1]  # Expecting 'Bearer <token>'
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            if not payload.get('role') or payload.get('role') != 'admin' :
                return jsonify({'error': 'Admin privileges required'}), 403
            admin_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(admin_id, *args, **kwargs)
    return decorated_function


def student_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.split(" ")[1]  # Expecting 'Bearer <token>'
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            if not payload.get('role') or payload.get('role') != 'student' :
                return jsonify({'error': 'Admin privileges required'}), 403
            student_id = payload['user_id']
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        return f(student_id, *args, **kwargs)
    return decorated

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.split(" ")[1]  # Expecting 'Bearer <token>'
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = payload['user_id']
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        return f(user_id, *args, **kwargs)
    return decorated


# Helper function to save files and generate URLs
def save_file(file, subfolder):
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], subfolder, filename)
        file.save(file_path)
        return f'/{app.config["UPLOAD_FOLDER"]}/{subfolder}/{filename}'
    return None

# Helper function to generate JWT token
def generate_token(user):
    """Generate a JWT token for the user with a 24-hour expiration."""
    payload = {
        'user_id': user.id,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token

# Database Models
from models import db, User, Section, ListeningAudio, ReadingPassage, \
                    Question, Option, TableQuestionRow, TableQuestionColumn, \
                    CorrectAnswer, SpeakingTask, WritingTask, QuestionAudio, \
                    UserAnswer, SpeakingResponse, WritingResponse, Score

db.init_app(app)

from flask_migrate import Migrate

migrate = Migrate(app, db)


migrate.init_app(app, db) # <<< Initialize migrate HERE



def create_question(question_data, section_type, reading_passage_id=None, listening_audio_id=None, audio_file=None):
    """Creates a question and adds it to the session, but does NOT commit.""" # below line is changed // Docstring update

    # # below is a new code
    # Extract paragraph_index specifically for reading questions
    paragraph_index_val = None
    if section_type == 'reading':
        paragraph_index_val = question_data.get('paragraph_index')
        # Optional: Add validation if needed
        if paragraph_index_val is not None and not isinstance(paragraph_index_val, int):
             print(f"Warning: Invalid paragraph_index type received: {paragraph_index_val}. Setting to None.")
             paragraph_index_val = None # Or raise an error: raise ValueError("paragraph_index must be an integer or null")
    # # above is a new code

    # Create the question
    question = Question(
        section_type=section_type,
        type=question_data['type'],
        prompt=question_data['prompt'],
        reading_passage_id=reading_passage_id if section_type == 'reading' else None,
        listening_audio_id=listening_audio_id if section_type == 'listening' else None,
        paragraph_index=paragraph_index_val # below line is changed // Assign the extracted paragraph_index
    )
    db.session.add(question)
    db.session.flush()  # Ensure question.id is available

    question_id_for_debug = question.id

    # --- The rest of the option/correct answer/table handling logic remains the same ---
    # Handle options and correct answers
    if question.type in ['multiple_to_multiple', 'insert_text', 'multiple_to_single', 'audio', 'prose_summary']:
        if question.type == 'audio' and audio_file:
            audio_url = save_file(audio_file, 'question_audios')
            question_audio = QuestionAudio(question_id=question.id, audio_url=audio_url)
            db.session.add(question_audio)

        if question.type == 'insert_text':
            options = ['a','b','c','d']
        else:
            options = question_data.get('options', [])

        print(f"DEBUG INSIDE create_question (ID: {question_id_for_debug}): Received options list: {options}")

        if question.type in ['multiple_to_single', 'audio']:
            correct_option_index = question_data.get('correctOptionIndex')
            corrects = [correct_option_index] if isinstance(correct_option_index, int) else []
        elif question.type == 'insert_text':
            insertion_point_text = question_data.get('correctInsertionPoint')
            try:
                # Ensure options list is populated before using index
                corrects = [options.index(insertion_point_text)] if insertion_point_text in options else []
            except ValueError:
                 print(f"Warning: Correct insertion point '{insertion_point_text}' not found in options for question {question.id}")
                 corrects = []
        else: # multiple_to_multiple, prose_summary
            correct_indices = question_data.get('correctAnswerIndices', [])
            # Ensure indices are valid integers
            corrects = [idx for idx in correct_indices if isinstance(idx, int)]

        option_objects = []
        for opt_text in options:
            option = Option(question=question, option_text=opt_text)
            db.session.add(option)
            option_objects.append(option)

        db.session.flush() # Flush after adding options to ensure they exist before adding correct answers

        for correct_index in corrects:
            if 0 <= correct_index < len(option_objects):
                correct_option_object = option_objects[correct_index]
                db.session.add(CorrectAnswer(question=question, option=correct_option_object))
            else:
                print(f"Warning: Correct answer index {correct_index} is out of bounds for question {question.id}. Options len: {len(option_objects)}")

    # Handle table questions
    elif question.type == 'table':
        rows = question_data.get('rows', [])
        columns = question_data.get('columns', [])
        correct_answers = question_data.get('correctTableSelections', [])

        row_objects = []
        for row_label in rows:
            row_obj = TableQuestionRow(question=question, row_label=row_label)
            db.session.add(row_obj)
            row_objects.append(row_obj)

        column_objects = []
        for col_label in columns:
            col_obj = TableQuestionColumn(question=question, column_label=col_label)
            db.session.add(col_obj)
            column_objects.append(col_obj)

        db.session.flush() # Flush after adding rows/columns

        for ca in correct_answers:
            row_index = ca.get('rowIndex')
            col_index = ca.get('colIndex')

            if isinstance(row_index, int) and 0 <= row_index < len(row_objects) and \
               isinstance(col_index, int) and 0 <= col_index < len(column_objects):
                correct_row_object = row_objects[row_index]
                correct_column_object = column_objects[col_index]
                print(f"Mapping Table Correct Answer: Row='{correct_row_object.row_label}' (Index {row_index}), Col='{correct_column_object.column_label}' (Index {col_index})")
                db.session.add(CorrectAnswer(question=question, table_row=correct_row_object, table_column=correct_column_object))
            else:
                print(f"Warning: Invalid table selection indices (row: {row_index}, col: {col_index}) for question {question.id}")

    # db.session.commit() # below line is changed // REMOVE commit from here
    return question # Return the question object added to the session

# Before request handler
@app.before_request
def log_request_info():
    print("=== Incoming Request ===")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Headers: {request.headers}")

    # Handle different content types
    if request.content_type:
        if request.content_type.startswith('multipart/form-data'):
            print(f"Form Data: {request.form.to_dict()}")
            print(f"Files: {request.files.to_dict()}")
        elif request.content_type == 'application/json':
            print(f"JSON Body: {request.get_json(silent=True)}")
        else:
            print(f"Raw Body: {request.get_data(as_text=True)}")
    else:
        print("No body content")
    print("=====================")

# Registration endpoint
@app.route('/register', methods=['POST'])
def register():
    """Register a new user with the role 'student'."""
    data = request.get_json()
    if not data:
        print('missing json data')
        return jsonify({'error': 'Missing JSON data'}), 400

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([username, email, password]):
        print('missing required fields')
        return jsonify({'error': 'Missing required fields'}), 400

    # Check for existing username or email
    existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
    if existing_user:
        print('username or email already exists')
        return jsonify({'error': 'Username or email already exists'}), 400

    # Create new user with role 'student'
    user = User(username=username, email=email, role='student')
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # return jsonify({'message': 'User registered successfully'}), 201
    token = generate_token(user)
    return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        }), 201

# Login endpoint
@app.route('/login', methods=['POST'])
def login():
    """Authenticate a user and return a JWT token."""
    data = request.get_json()
    if not data:
        print('missing json data')
        return jsonify({'error': 'Missing JSON data'}), 400

    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        print('missing required fields')
        return jsonify({'error': 'Missing required fields'}), 400

    user = User.query.filter_by(email=email).first()
    if user and user.check_password(password):
        token = generate_token(user)
        return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

# Optional logout endpoint (client-side token discard recommended)
@app.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint (client should discard token)."""
    return jsonify({'message': 'Logout successful'}), 200

# Route to serve audio files
@app.route('/files/<path:filename>')
def get_file(filename):
    # Construct full path
    file_path = os.path.join(os.environ.get('BASE_DIR'), filename)
    # Security check: ensure path is within BASE_DIR
    if not file_path.startswith(os.environ.get('BASE_DIR')):
        abort(403, description="Access denied")
    
    # Check if file exists and is a file (not directory)
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        abort(404, description="File not found")
    
    return send_file(
        file_path,
        mimetype='audio/mpeg',
        as_attachment=False
    )


# Readign section

@app.route('/reading', methods=['POST'])
@admin_required
def create_reading_section():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON data'}), 400

    title = data.get('title')
    if not title:
        return jsonify({'error': 'Missing title'}), 400

    passages_data = data.get('passages', [])
    if not passages_data:
        return jsonify({'error': 'No passages provided'}), 400

    try: # Add try...except block for robust error handling
        section = Section(section_type='reading', title=title)
        db.session.add(section)
        # Flush here is okay if you need the section ID *before* adding passages,
        # but often adding all then flushing/committing at the end is fine too.
        # db.session.flush()

        created_passages_info = [] # To store info for the response

        for passage_data in passages_data:
            passage_title = passage_data.get('title')
            content = passage_data.get('content')
            if not passage_title or not content:
                # Rollback because data is invalid
                db.session.rollback()
                return jsonify({'error': 'Missing title or content in passage'}), 400

            passage = ReadingPassage(title=passage_title, content=content, section=section)
            db.session.add(passage)
            db.session.flush() # Need passage.id before creating questions

            passage_info = {'id': passage.id, 'title': passage.title, 'content': passage.content}
            created_passages_info.append(passage_info)

            for question_data in passage_data.get('questions', []):
                print('Data before creating question: ', question_data) # Good debug print
                # create_question now adds to session but doesn't commit
                create_question(question_data, 'reading', reading_passage_id=passage.id)

        # Single commit after all passages and questions are added successfully
        db.session.commit()

        return jsonify({
            'id': section.id,
            'title': section.title,
            'passages': created_passages_info
        }), 201

    except Exception as e:
        db.session.rollback() # Rollback on any error during processing
        print(f"Error creating reading section: {e}") # Log the error
        # Consider more specific error handling (ValueError, IntegrityError, etc.)
        return jsonify({'error': f'An internal error occurred: {str(e)}'}), 500

@app.route('/reading/<int:section_id>', methods=['GET'])
def get_reading_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='reading').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    passages = ReadingPassage.query.filter_by(section_id=section.id).order_by(ReadingPassage.id).all() # below line is changed // Added order_by for consistency
    passages_data = []
    for passage in passages:
        questions = Question.query.filter_by(reading_passage_id=passage.id).order_by(Question.id).all() # below line is changed // Added order_by for consistency
        questions_data = []
        for q in questions:
            # Fetch options ordered by ID to ensure consistent A, B, C, D mapping
            options = Option.query.filter_by(question_id=q.id).order_by(Option.id).all() # below line is changed // Added order_by for consistency
            options_data = [o.option_text for o in options]

            # Add the paragraph_index to the question data dictionary
            question_dict = {
                'id': q.id,
                'type': q.type,
                'prompt': q.prompt,
                'options': options_data,
                'paragraph_index': q.paragraph_index # below line is changed // Added paragraph_index field
                # Note: JSON serialization handles None -> null automatically
            }
            
            # Add summary_statement if it exists (for prose_summary)
            # Assuming your Question model has a 'summary_statement' field/relationship
            if hasattr(q, 'summary_statement') and q.summary_statement:
                 question_dict['summary_statement'] = q.summary_statement
            
            questions_data.append(question_dict)

        passages_data.append({
            'id': passage.id,
            'title': passage.title,
            'content': passage.content,
            'questions': questions_data
        })

    return jsonify({
        'id': section.id,
        'title': section.title,
        'passages': passages_data
    }), 200

@app.route('/reading/<int:section_id>', methods=['PUT'])
@admin_required
def update_reading_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='reading').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON data'}), 400

    section.title = data.get('title', section.title)
    db.session.commit()

    return jsonify({'message': 'Section updated successfully'}), 200

@app.route('/reading/<int:section_id>', methods=['DELETE'])
@admin_required
def delete_reading_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='reading').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    db.session.delete(section)
    db.session.commit()
    return jsonify({'message': 'Section deleted successfully'}), 200

@app.route('/readings', methods=['GET'])
def get_reading_sections():
    sections = Section.query.filter_by(section_type='reading').all()
    if not sections:
        return jsonify({'error': 'Section not found'}), 404

    return jsonify({
        'total': len(sections),
        'sections': [{'id': section.id, 'title': section.title} for section in sections],
    }), 200

# Assuming token_required decorator provides student_id
@app.route('/reading/<int:section_id>/submit', methods=['POST'])
@student_required
def submit_reading_answers(student_id, section_id):
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request body'}), 400
        data = data['answers']

        # Step 1: Validate passages belong to the specified section
        passage_ids = [int(pid) for pid in data.keys()]  # Convert keys to integers
        passages = db.session.query(ReadingPassage).filter(
            ReadingPassage.id.in_(passage_ids),
            ReadingPassage.section_id == section_id
        ).all()

        if len(passages) != len(passage_ids):
            return jsonify({'error': 'One or more passage IDs are invalid or do not belong to section'}), 404

        # Step 2: Process and store user answers
        for passage_id_str, questions in data.items():
            passage_id = int(passage_id_str)
            for question_id_str, user_answer_indices in questions.items():
                question_id = int(question_id_str)
                # Verify question belongs to the passage
                question = db.session.query(Question).filter_by(
                    id=question_id,
                    reading_passage_id=passage_id
                ).first()
                if not question:
                    return jsonify({'error': f'Question ID {question_id} not in passage {passage_id}'}), 404

                # Get options for the question, ordered by id
                options = db.session.query(Option).filter_by(
                    question_id=question_id
                ).order_by(Option.id).all()
                option_ids = [opt.id for opt in options]

                # Map user answer indices to option_ids
                try:
                    selected_option_ids = []
                    for idx in user_answer_indices:
                        if idx.isalpha():
                            # Convert letter (e.g., "b") to index (e.g., 1)
                            index = ord(idx.lower()) - ord('a')
                        else:
                            index = int(idx)
                        if 0 <= index < len(option_ids):
                            selected_option_ids.append(option_ids[index])
                        else:
                            return jsonify({'error': f'Invalid option index {idx} for question {question_id}'}), 400
                except ValueError:
                    return jsonify({'error': f'Invalid answer format for question {question_id}'}), 400

                # Delete previous answers for this user and question
                db.session.query(UserAnswer).filter_by(
                    user_id=student_id,
                    question_id=question_id
                ).delete()

                # Insert new user answers
                for opt_id in selected_option_ids:
                    user_answer = UserAnswer(
                        user_id=student_id,
                        question_id=question_id,
                        option_id=opt_id
                    )
                    db.session.add(user_answer)

        # Commit all changes to the database
        db.session.commit()

        # Step 3: Calculate the section's score
        total_score = 0
        # Get all questions in the section via reading passages
        questions = (
            db.session.query(Question, db.func.count(CorrectAnswer.id).label('correct_count'))
            .outerjoin(CorrectAnswer, Question.id == CorrectAnswer.question_id)
            .join(ReadingPassage, Question.reading_passage_id == ReadingPassage.id)
            .filter(ReadingPassage.section_id == section_id)
            .group_by(Question.id)
            .all()
        )

        for question, correct_count in questions:
            # Determine points based on question type and number of correct answers
            if question.type in ('prose_summary', 'table') and correct_count > 1:
                points = 2  # Multiple-selection or table questions
            else:
                points = 1  # Default for other types (e.g., 'insert-a-text')

            # Get correct answers
            correct_option_ids = set(
                ca.option_id for ca in db.session.query(CorrectAnswer)
                .filter_by(question_id=question.id)
                .all()
            )

            # Get user answers
            user_option_ids = set(
                ua.option_id for ua in db.session.query(UserAnswer)
                .filter_by(question_id=question.id, user_id=student_id)
                .all()
            )

            print('correct answers: ', correct_option_ids, '\nuser options: ', user_option_ids)

            # how to calculate to 30
            # total_score = (raw_score / max_possible_score) * 30

            # Scoring: all-or-nothing
            if user_option_ids == correct_option_ids and user_option_ids:
                total_score += points

        # Step 4: Return the section's score
        return jsonify({'section_id': section_id, 'score': total_score})

    except Exception as e:
        db.session.rollback()  # Roll back on error
        return jsonify({'error': str(e)}), 500

# Listening section

@app.route('/listening', methods=['POST'])
@admin_required
def create_listening_section():
    if 'sectionData' not in request.form:
        return jsonify({'error': 'Missing sectionData'}), 400
    
    try:
        section_data = json.loads(request.form['sectionData'])
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON in sectionData'}), 400

    title = section_data.get('title')
    if not title:
        return jsonify({'error': 'Missing title'}), 400

    audios_data = section_data.get('audioItems', []) 
    if not audios_data:
        return jsonify({'error': 'No audio items provided in sectionData'}), 400

    section = Section(section_type='listening', title=title)
    db.session.add(section)

    for audio_data in audios_data:
        audio_item_id = audio_data.get('id') # Make sure frontend includes 'id' here
        if not audio_item_id:
            return jsonify({'error': f'Missing id for an audio item'}), 400
        
        audio_title = audio_data.get('title')
        if not audio_title:
            return jsonify({'error': f'Missing title for audio {audio_item_id}'}), 400
        
        audio_file_key = f'audioItem_{audio_item_id}_audioFile'
        image_file_key = f'audioItem_{audio_item_id}_imageFile'

        audio_file = request.files.get(audio_file_key)
        if not audio_file:
            return jsonify({'error': f'Missing audio file for audio item {audio_item_id} (expected key: {audio_file_key})'}), 400

        photo_file = request.files.get(image_file_key)
        audio_url = save_file(audio_file, 'listening_audios')
        photo_url = save_file(photo_file, 'listening_photos') if photo_file else None

        audio = ListeningAudio(title=audio_title, audio_url=audio_url, photo_url=photo_url, section=section)
        db.session.add(audio)
        db.session.flush() # to get the id to use in create_question
        
        
        for question_data in audio_data.get('questions', []):
            question_id = question_data.get('id') # Make sure frontend includes question 'id' here
            if not question_id:
                return jsonify({'error': f'Missing id for a question in audio item {audio_item_id}'}), 400
                
            snippet_file_key = f'question_{question_id}_snippetFile'
            question_audio_file = request.files.get(snippet_file_key)

            question_data_cleaned = {k: v for k, v in question_data.items() if k != 'id'}
            create_question(question_data_cleaned, 'listening', listening_audio_id=audio.id, audio_file=question_audio_file)

    db.session.commit()
    
    return jsonify({
        'id': section.id,
        'title': section.title,
        'audios': [{'id': a.id, 'title': a.title, 'audio_url': a.audio_url, 'photo_url': a.photo_url} 
                  for a in section.listening_audios]
    }), 201

@app.route('/listening/<int:section_id>', methods=['GET'])
def get_listening_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='listening').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    audios = ListeningAudio.query.filter_by(section_id=section.id).all()
    audios_data = []
    for audio in audios:
        questions = Question.query.filter_by(listening_audio_id=audio.id).all()
        questions_data = []
        for q in questions:
            if q.type == 'table':
                table_rows = TableQuestionRow.query.filter_by(question_id=q.id).all()
                table_columns = TableQuestionColumn.query.filter_by(question_id=q.id).all()
                rows = [row.row_label for row in table_rows]
                columns = [col.column_label for col in table_columns]
                questions_data.append({'id': q.id, 'type': q.type, 'prompt': q.prompt,  'rows': rows, 'columns': columns})
            else:
                options = Option.query.filter_by(question_id=q.id).all()
                options_data = [o.option_text for o in options]
                if q.type == 'audio':
                    audio_url = QuestionAudio.query.filter_by(question_id=q.id).first()
                    questions_data.append({'id': q.id, 'type': q.type, 'audio_url': audio_url.audio_url, 'prompt': q.prompt, 'options': options_data})
                else:
                    questions_data.append({'id': q.id, 'type': q.type, 'prompt': q.prompt, 'options': options_data})
        audios_data.append({
            'id': audio.id,
            'title': audio.title,
            'audio_url': audio.audio_url,
            'photo_url': audio.photo_url,
            'questions': questions_data
        })

    return jsonify({
        'id': section.id,
        'title': section.title,
        'audios': audios_data
    }), 200

@app.route('/listening/<int:section_id>', methods=['PUT'])
@admin_required
def update_listening_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='listening').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON data'}), 400

    section.title = data.get('title', section.title)
    db.session.commit()

    return jsonify({'message': 'Section updated successfully'}), 200

@app.route('/listening/<int:section_id>', methods=['DELETE'])
@admin_required
def delete_listening_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='listening').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    audios = ListeningAudio.query.filter_by(section_id=section.id).all()
    for audio in audios:
        if audio.audio_url:
            try:
                os.remove(audio.audio_url.lstrip('/'))
            except OSError:
                pass
        if audio.photo_url:
            try:
                os.remove(audio.photo_url.lstrip('/'))
            except OSError:
                pass

    db.session.delete(section)
    db.session.commit()
    return jsonify({'message': 'Section deleted successfully'}), 200

@app.route('/listenings', methods=['GET'])
def get_listening_sections():
    sections = Section.query.filter_by(section_type='listening').all()
    if not sections:
        return jsonify({'error': 'Section not found'}), 404

    return jsonify({
        'total': len(sections),
        'sections': [{'id': section.id, 'title': section.title} for section in sections],
    }), 200


@app.route('/listening/<int:section_id>/submit', methods=['POST'])
@student_required
def submit_listening_answers(student_id, section_id):
    try:
        # Parse and validate the JSON request body
        data = request.get_json()
        if not data or not isinstance(data, dict) or 'answers' not in data:
            return jsonify({'error': 'Invalid request body'}), 400

        answers = data['answers']
        if not isinstance(answers, dict):
            return jsonify({'error': 'Invalid answers format'}), 400

        # **Step 1: Validate Audio IDs**
        audio_ids = [int(audio_id) for audio_id in answers.keys()]
        audios = db.session.query(ListeningAudio).filter(
            ListeningAudio.id.in_(audio_ids),
            ListeningAudio.section_id == section_id
        ).all()
        if len(audios) != len(audio_ids):
            return jsonify({'error': 'One or more audio IDs are invalid or do not belong to this section'}), 404

        # **Step 2: Process and Store User Answers**
        for audio_id_str, questions in answers.items():
            audio_id = int(audio_id_str)
            for question_id_str, user_answers in questions.items():
                question_id = int(question_id_str)
                # Verify the question belongs to the audio
                question = db.session.query(Question).filter_by(
                    id=question_id,
                    listening_audio_id=audio_id
                ).first()
                if not question:
                    return jsonify({'error': f'Question ID {question_id} not found in audio {audio_id}'}), 404

                # Fetch all options for the question
                options = db.session.query(Option).filter_by(question_id=question_id).order_by(Option.id).all()
                option_map = {chr(97 + i): opt.id for i, opt in enumerate(options)}  # 'a' -> option_id, 'b' -> option_id, etc.
                # Delete previous answers for this user and question
                db.session.query(UserAnswer).filter_by(
                    user_id=student_id,
                    question_id=question_id
                ).delete()

                if question.type == 'table':
                    # Process table question answers
                    for row_id_str, columns in user_answers.items():
                        # implementing a translation but in the future it would be better just to pass the row ids from the front-end
                        row_id = int(row_id_str)
                        rows = TableQuestionRow.query.filter_by(question_id=question_id).all()
                        row_id = rows[row_id].id
                        for col_id_str, selected in columns.items():
                            if selected:  # True indicates the cell is selected
                                col_id = int(col_id_str)
                                columns = TableQuestionColumn.query.filter_by(question_id=question_id).all()
                                col_id = columns[col_id].id
                                user_answer = UserAnswer(
                                    user_id=student_id,
                                    question_id=question_id,
                                    table_row_id=row_id,
                                    table_column_id=col_id
                                )
                                db.session.add(user_answer)
                else:
                    # Handle multiple-choice questions
                    selected_option_ids = []
                    for answer in user_answers:
                        if isinstance(answer, str) and answer.lower() in option_map:
                            selected_option_ids.append(option_map[answer.lower()])
                        else:
                            return jsonify({'error': f'Invalid option {answer} for question {question_id}'}), 400

                    # Store the selected options
                    for option_id in selected_option_ids:
                        user_answer = UserAnswer(
                            user_id=student_id,
                            question_id=question_id,
                            option_id=option_id
                        )
                        db.session.add(user_answer)

        # Commit all changes to the database
        db.session.commit()

        # **Step 3: Calculate the Score**
        total_score = 0
        questions = (
            db.session.query(Question, db.func.count(CorrectAnswer.id).label('correct_count'))
            .outerjoin(CorrectAnswer, Question.id == CorrectAnswer.question_id)
            .join(ListeningAudio, Question.listening_audio_id == ListeningAudio.id)
            .filter(ListeningAudio.section_id == section_id)
            .group_by(Question.id)
            .all()
        )

        for question, correct_count in questions:
            # Assign points based on question type and number of correct answers
            if question.type in ('prose_summary', 'table') and correct_count > 1:
                points = 2  # For multiple-selection or table questions
            else:
                points = 1  # Default case

            # Get correct and user answers
            if question.type == 'table':
                user_option_ids = set()
                for ua in db.session.query(UserAnswer) \
                        .filter_by(question_id=question.id, user_id=student_id) \
                        .all():
                    user_option_ids.add((ua.table_row_id, ua.table_column_id))

                correct_option_ids = set()
                for ca in db.session.query(CorrectAnswer) \
                        .filter_by(question_id=question.id) \
                        .all():
                    correct_option_ids.add((ca.table_row_id, ca.table_column_id))
            else:
                user_option_ids = set(
                    ua.option_id for ua in db.session.query(UserAnswer)
                    .filter_by(question_id=question.id, user_id=student_id)
                    .all()
                )
                correct_option_ids = set(
                    ca.option_id for ca in db.session.query(CorrectAnswer)
                    .filter_by(question_id=question.id)
                    .all()
                )

            print('correct answers: ', correct_option_ids, '\nuser options: ', user_option_ids)

            # All-or-nothing scoring
            if user_option_ids == correct_option_ids and user_option_ids:
                total_score += points

        # **Step 4: Return the Response**
        return jsonify({
            'section_id': section_id,
            'score': total_score
        })

    except Exception as e:
        db.session.rollback()  # Roll back on error
        return jsonify({'error': str(e)}), 500

# Speaking section

@app.route('/speaking', methods=['POST'])
@admin_required
def create_speaking_section():
    if 'sectionData' not in request.form:
        return jsonify({'error': 'Missing sectionData'}), 400

    try:
        section_data = json.loads(request.form['sectionData'])
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON in sectionData'}), 400

    title = section_data.get('title')
    if not title:
        return jsonify({'error': 'Missing title'}), 400

    # --- MODIFICATION START ---
    # Get the list of tasks from the 'tasks' key
    tasks_list = section_data.get('tasks', [])

    # Validate if we received exactly 4 tasks
    if len(tasks_list) != 4:
        return jsonify({'error': f'Expected 4 tasks, but received {len(tasks_list)}'}), 400

    # Convert list to a dictionary keyed by taskNumber for easier access
    # Also validate basic structure here
    tasks_dict = {}
    for task_data in tasks_list:
        task_num = task_data.get('taskNumber')
        if task_num is None or not isinstance(task_num, int) or not (1 <= task_num <= 4):
             return jsonify({'error': f'Invalid or missing taskNumber in task data: {task_data}'}), 400
        if 'prompt' not in task_data or not task_data.get('prompt','').strip():
             return jsonify({'error': f'Missing or empty prompt for task {task_num}'}), 400
        tasks_dict[task_num] = task_data

    # Explicitly check if all task numbers 1-4 are present
    if not all(num in tasks_dict for num in range(1, 5)):
        return jsonify({'error': 'Missing data for one or more required tasks (1-4)'}), 400

    # --- MODIFICATION END ---

    section = Section(section_type='speaking', title=title)
    db.session.add(section)
    db.session.flush() # Flush to get section.id if needed by SpeakingTask relationships immediately (depends on model)

    try:
        # Task 1: prompt only
        task1_data = tasks_dict[1]
        db.session.add(SpeakingTask(section=section, task_number=1, prompt=task1_data['prompt']))

        # Task 2: passage, prompt, audio
        task2_data = tasks_dict[2]
        # --- Use correct file key ---
        task2_audio = request.files.get('audio_task_2')
        if not task2_audio:
            # Rollback or cleanup might be needed if transaction fails midway
            return jsonify({'error': 'Missing audio file for task 2 (expected key: audio_task_2)'}), 400
        if 'passage' not in task2_data or not task2_data.get('passage','').strip():
             return jsonify({'error': f'Missing or empty passage for task 2'}), 400
        db.session.add(SpeakingTask(
            section=section, task_number=2, passage=task2_data.get('passage'),
            prompt=task2_data['prompt'], audio_url=save_file(task2_audio, 'speaking_audios')
        ))

        # Task 3: passage, prompt, audio
        task3_data = tasks_dict[3]
        # --- Use correct file key ---
        task3_audio = request.files.get('audio_task_3')
        if not task3_audio:
            return jsonify({'error': 'Missing audio file for task 3 (expected key: audio_task_3)'}), 400
        if 'passage' not in task3_data or not task3_data.get('passage','').strip():
             return jsonify({'error': f'Missing or empty passage for task 3'}), 400
        db.session.add(SpeakingTask(
            section=section, task_number=3, passage=task3_data.get('passage'),
            prompt=task3_data['prompt'], audio_url=save_file(task3_audio, 'speaking_audios')
        ))

        # Task 4: prompt, audio
        task4_data = tasks_dict[4]
        # --- Use correct file key ---
        task4_audio = request.files.get('audio_task_4')
        if not task4_audio:
            return jsonify({'error': 'Missing audio file for task 4 (expected key: audio_task_4)'}), 400
        db.session.add(SpeakingTask(
            section=section, task_number=4, prompt=task4_data['prompt'],
            audio_url=save_file(task4_audio, 'speaking_audios')
        ))

        db.session.commit()

    except Exception as e:
        db.session.rollback() # Rollback on any error during processing
        print(f"Error creating speaking section: {e}") # Log the error
        return jsonify({'error': f'An internal error occurred: {str(e)}'}), 500


    # Fetch the created tasks to return them (optional but good practice)
    created_tasks = SpeakingTask.query.filter_by(section_id=section.id).order_by(SpeakingTask.task_number).all()

    return jsonify({
        'id': section.id,
        'title': section.title,
        'tasks': [{'id': t.id, 'task_number': t.task_number, 'passage': t.passage,
                  'prompt': t.prompt, 'audio_url': t.audio_url} for t in created_tasks]
    }), 201

@app.route('/speaking/<int:section_id>', methods=['GET'])
def get_speaking_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='speaking').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    tasks = SpeakingTask.query.filter_by(section_id=section.id).all()
    tasks_data = [{'id': t.id, 'task_number': t.task_number, 'passage': t.passage, 
                   'prompt': t.prompt, 'audio_url': t.audio_url} for t in tasks]

    return jsonify({
        'id': section.id,
        'title': section.title,
        'task1': tasks_data[0],
        'task2': tasks_data[1],
        'task3': tasks_data[2],
        'task4': tasks_data[3]
    }), 200

@app.route('/speaking/<int:section_id>', methods=['PUT'])
@admin_required
def update_speaking_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='speaking').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON data'}), 400

    section.title = data.get('title', section.title)
    db.session.commit()

    return jsonify({'message': 'Section updated successfully'}), 200

@app.route('/speaking/<int:section_id>', methods=['DELETE'])
@admin_required
def delete_speaking_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='speaking').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    tasks = SpeakingTask.query.filter_by(section_id=section.id).all()
    for task in tasks:
        if task.audio_url:
            try:
                os.remove(task.audio_url.lstrip('/'))
            except OSError:
                pass

    db.session.delete(section)
    db.session.commit()
    return jsonify({'message': 'Section deleted successfully'}), 200

@app.route('/speakings', methods=['GET'])
def get_speaking_sections():
    sections = Section.query.filter_by(section_type='speaking').all()
    if not sections:
        return jsonify({'error': 'Section not found'}), 404

    return jsonify({
        'total': len(sections),
        'sections': [{'id': section.id, 'title': section.title} for section in sections],
    }), 200

@app.route('/speaking/<int:section_id>/submit', methods=['POST'])
@student_required
def submit_speaking_answers(student_id, section_id):
    """Submit speaking answers for a given section."""
    # Verify the section exists and is a speaking section
    section = db.session.query(Section).filter_by(id=section_id, section_type='speaking').first()
    if not section:
        return jsonify({'error': 'Section not found or not a speaking section'}), 404

    # Define expected task numbers
    task_numbers = [1, 2, 3, 4]

    # Check if all required recording files are present
    for num in task_numbers:
        field_name = f'task{num}Recording'
        if field_name not in request.files:
            return jsonify({'error': f'Missing {field_name}'}), 400

    # Process each recording
    for num in task_numbers:
        # Find the corresponding task
        task = db.session.query(SpeakingTask).filter_by(section_id=section_id, task_number=num).first()
        if not task:
            return jsonify({'error': f'Speaking task {num} not found for this section'}), 404

        # Get the uploaded file
        file = request.files[f'task{num}Recording']
        if file.filename == '':
            return jsonify({'error': f'No selected file for task {num}'}), 400
        
        # Delete previous response audios for this user and task
        prev_response = SpeakingResponse.query.filter_by(task_id=task.id, user_id=student_id).first()
        if prev_response:
            os.remove(prev_response.audio_url.lstrip('/'))
            db.session.delete(prev_response)

        # Save the file and get its URL/path
        file.filename = str(uuid.uuid4())
        audio_url = save_file(file, 'speaking_responses')

        # Store the response in the database
        response = SpeakingResponse(
            user_id=student_id,
            task_id=task.id,
            audio_url=audio_url
        )
        db.session.add(response)

    # Commit all changes
    db.session.commit()
    return jsonify({'message': 'Speaking answers submitted successfully'}), 200

@app.route('/speaking/<int:section_id>/review/<int:student_id>', methods=['GET'])
@token_required
def review_speaking_section(user_id, student_id, section_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        s_id = student_id
        if user.role == 'student':
            s_id = user.id

        # Verify the section exists and is a speaking section
        section = Section.query.filter_by(id=section_id, section_type='speaking').first()
        if not section:
            return jsonify({'error': 'Speaking section not found'}), 404
        
        responses = db.session.query(SpeakingResponse, Score)\
        .join(SpeakingResponse.task)\
        .outerjoin(Score, Score.response_id == SpeakingResponse.id)\
        .filter(
            SpeakingResponse.user_id == s_id,
            SpeakingTask.section_id == section_id
        )\
        .order_by(
            SpeakingTask.task_number
        )\
        .all()


        # If no responses are found, return "data doesn't exist"
        if not responses:
            return jsonify({'message': "Data doesn't exist"}), 404
        
       
        result = [
            {
                'response_id': response.id,
                'task_id': response.task_id,
                'task_number': response.task.task_number,
                'audio_url': response.audio_url,
                'score': float(score.score) if score and score.score is not None else None,
                'feedback': score.feedback if score and score.feedback is not None else None
            }
            for response, score in responses
        ]

        # Return the JSON response
        return jsonify({
            'section_id': section_id,
            'tasks': result
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/speaking/<int:section_id>/review', methods=['POST'])
@admin_required_with_id
def submit_speaking_review(current_user_id, section_id):
    try:
        # Validate that the section exists and is a speaking section
        section = db.session.query(Section).filter_by(id=section_id, section_type='speaking').first()
        if not section:
            return jsonify({'error': 'Speaking section not found'}), 404

        # Check if the user is authorized (teacher or admin)
        reviewer = db.session.query(User).filter_by(id=current_user_id).first()
        if reviewer.role not in ['teacher', 'admin']:
            return jsonify({'error': 'Unauthorized to submit reviews'}), 403

        # Get the JSON data from the request
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({'error': 'Invalid input: Expected a list of task reviews'}), 400

        # Fetch all speaking tasks in this section
        speaking_tasks = db.session.query(SpeakingTask).filter_by(section_id=section_id).all()
        task_ids = {task.id for task in speaking_tasks}

        # Ensure reviews are submitted for all speaking tasks
        submitted_task_ids = {item['task_id'] for item in data}
        if submitted_task_ids != task_ids:
            return jsonify({'error': 'Must submit reviews for all speaking tasks in the section'}), 400

        # Process each review
        for item in data:
            response_id = item.get('response_id')
            task_id = item.get('task_id')
            score_value = item.get('score')
            feedback = item.get('feedback')

            # Validate the input
            if not isinstance(response_id, int):
                return jsonify({'error': f'Invalid response_id: {response_id}'}), 400
            if not isinstance(task_id, int) or task_id not in task_ids:
                return jsonify({'error': f'Invalid task_id: {task_id}'}), 400
            if not isinstance(score_value, (int, float)) or score_value < 0 or score_value > 10:
                return jsonify({'error': f'Invalid score for task {task_id}: Must be between 0 and 10'}), 400
            if not isinstance(feedback, str) or not feedback.strip():
                return jsonify({'error': f'Invalid feedback for task {task_id}: Must be a non-empty string'}), 400

            # Check for an existing speaking response
            response = SpeakingResponse.query.get(response_id)
            if not response:
                return jsonify({'error': f'No speaking response found for task {task_id}'}), 404

            # Update or create the review
            existing_score = db.session.query(Score).filter_by(
                response_id=response.id,
                response_type='speaking'
            ).first()
            if existing_score:
                existing_score.score = score_value
                existing_score.feedback = feedback
                existing_score.scored_by = current_user_id
            else:
                new_score = Score(
                    response_id=response.id,
                    response_type='speaking',
                    score=score_value,
                    feedback=feedback,
                    scored_by=current_user_id
                )
                db.session.add(new_score)

        # Save all changes
        db.session.commit()
        return jsonify({'message': 'Speaking reviews submitted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



# Writing section
    
@app.route('/writing', methods=['POST'])
@admin_required
def create_writing_section():
    if 'sectionData' not in request.form:
        return jsonify({'error': 'Missing sectionData'}), 400

    try:
        section_data = json.loads(request.form['sectionData'])
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON in sectionData'}), 400

    title = section_data.get('title')
    if not title:
        return jsonify({'error': 'Missing title'}), 400

    tasks_list = section_data.get('tasks', [])

    if len(tasks_list) != 2:
        return jsonify({'error': f'Expected 2 tasks, but received {len(tasks_list)}'}), 400

    tasks_dict = {}
    for task_data in tasks_list:
        task_num = task_data.get('taskNumber')
        if task_num is None or not isinstance(task_num, int) or not (1 <= task_num <= 2):
             return jsonify({'error': f'Invalid or missing taskNumber in task data: {task_data}'}), 400
        
        if 'prompt' not in task_data or not task_data.get('prompt','').strip():
             return jsonify({'error': f'Missing or empty prompt for task {task_num}'}), 400
        
        if 'passage' not in task_data or not task_data.get('passage','').strip():
             return jsonify({'error': f'Missing or empty passage for task {task_num}'}), 400

        tasks_dict[task_num] = task_data

    if not all(num in tasks_dict for num in range(1, 3)):
        return jsonify({'error': 'Missing data for one or more required tasks (1-2)'}), 400

    section = Section(section_type='writing', title=title)
    db.session.add(section)
    db.session.flush() 

    try:
        task1_data = tasks_dict[1]

        task1_audio = request.files.get('audio_task_1')
        if not task1_audio:
            return jsonify({'error': 'Missing audio file for task 1 (expected key: audio_task_1)'}), 400

        db.session.add(WritingTask(
            section=section, task_number=1, passage=task1_data['passage'],
            prompt=task1_data['prompt'], audio_url=save_file(task1_audio, 'writing_audios')
        ))

        task2_data = tasks_dict[2]
        db.session.add(WritingTask(
            section=section, task_number=2, passage=task2_data['passage'],
            prompt=task2_data['prompt']
        ))

        db.session.commit()

    except Exception as e:
        db.session.rollback() 
        print(f"Error creating writing section: {e}")
        return jsonify({'error': f'An internal error occurred: {str(e)}'}), 500

    created_tasks = WritingTask.query.filter_by(section_id=section.id).order_by(WritingTask.task_number).all()

    return jsonify({
        'id': section.id,
        'title': section.title,
        'tasks': [{'id': t.id, 'task_number': t.task_number, 'passage': t.passage,
                  'prompt': t.prompt, 'audio_url': t.audio_url} for t in created_tasks]
    }), 201

@app.route('/writing/<int:section_id>', methods=['GET'])
def get_writing_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='writing').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    tasks = WritingTask.query.filter_by(section_id=section.id).all()
    tasks_data = [{'id': t.id, 'task_number': t.task_number, 'passage': t.passage, 
                   'prompt': t.prompt, 'audio_url': t.audio_url} for t in tasks]

    return jsonify({
        'id': section.id,
        'title': section.title,
        'task1': tasks_data[0],
        'task2': tasks_data[1]
    }), 200

@app.route('/writing/<int:section_id>', methods=['PUT'])
@admin_required
def update_writing_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='writing').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON data'}), 400

    section.title = data.get('title', section.title)
    db.session.commit()

    return jsonify({'message': 'Section updated successfully'}), 200

@app.route('/writing/<int:section_id>', methods=['DELETE'])
@admin_required
def delete_writing_section(section_id):
    section = Section.query.filter_by(id=section_id, section_type='writing').first()
    if not section:
        return jsonify({'error': 'Section not found'}), 404

    tasks = WritingTask.query.filter_by(section_id=section.id).all()
    for task in tasks:
        if task.audio_url:
            try:
                os.remove(task.audio_url.lstrip('/'))
            except OSError:
                pass

    db.session.delete(section)
    db.session.commit()
    return jsonify({'message': 'Section deleted successfully'}), 200

@app.route('/writings', methods=['GET'])
def get_writing_sections():
    sections = Section.query.filter_by(section_type='writing').all()
    if not sections:
        return jsonify({'error': 'Section not found'}), 404

    return jsonify({
        'total': len(sections),
        'sections': [{'id': section.id, 'title': section.title} for section in sections],
    }), 200

@app.route('/writing/<int:section_id>/submit', methods=['POST'])
@student_required
def submit_writing_answers(student_id, section_id):
    """
    Expects JSON payload:
    {
        "answers": [
            {"task_id": 1, "response_text": "Answer for task 1"},
            {"task_id": 2, "response_text": "Answer for task 2"}
        ]
    }
    """
    try:
        data = request.get_json()
        answers = data.get('answers')
        if len(answers) != 2:
            return jsonify({'error': 'the request body is not of expected format'}), 400
        # Verify the section exists and is a writing section
        section = db.session.query(Section).filter_by(id=section_id, section_type='writing').first()
        if not section:
            return jsonify({'error': 'Section not found or not a writing section'}), 404

        # Define expected task numbers
        task_numbers = [1, 2]

        tasks = WritingTask.query.filter(WritingTask.section_id == section.id).all()
        # assers exactly two tasks are present
        if len(tasks) != 2:
            return jsonify({'error': 'Invalid task IDs or tasks not in specified section'}), 400


        # Create WritingResponse entries
        for task in tasks:
            text = answers[f'task{task.task_number}']
            word_count = len(text.split())  # Basic word count calculation
            # Delete previous response audios for this user and task
            prev_response = WritingResponse.query.filter_by(task_id=task.id, user_id=student_id).first()
            if prev_response:
                prev_response.response_text = text
                prev_response.word_count = word_count
            else:
                new_response = WritingResponse(
                    user_id=student_id,
                    task_id=task.id,
                    response_text=text,
                    word_count=word_count
                )
                db.session.add(new_response)
        db.session.commit()
        return jsonify({'message': 'Writing answers submitted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/writing/<int:section_id>/review/<int:student_id>', methods=['GET'])
@token_required
def review_writing_section(user_id, section_id, student_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        s_id = student_id
        if user.role == 'student':
            s_id = user.id

        if not section_id or not s_id:
            return jsonify({'error': 'Missing section_id or student_id'}), 400

        # Fetch responses with tasks and scores
        responses = db.session.query(WritingResponse, WritingTask, Score)\
            .join(WritingTask, WritingResponse.task_id == WritingTask.id)\
            .outerjoin(Score, (Score.response_id == WritingResponse.id) & (Score.response_type == 'writing'))\
            .filter(
                WritingResponse.user_id == s_id,
                WritingTask.section_id == section_id
            )\
            .order_by(WritingTask.task_number)\
            .all()

        if len(responses) != 2:
            return jsonify({'error': 'Expected exactly 2 responses for this section'}), 404

        result = [
            {
                'response_id': response.id,
                'task_id': task.id,
                'task_number': task.task_number,
                'prompt': task.prompt,
                'response_text': response.response_text,
                'score': float(score.score) if score and score.score is not None else None,
                'feedback': score.feedback if score and score.feedback is not None else None
            }
            for response, task, score in responses
        ]

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/writing/<int:section_id>/review', methods=['POST'])
@admin_required_with_id
def submit_writing_review(current_user_id, section_id):
    """
    Submit reviews for writing responses (2 tasks).
    Expects JSON payload:
    {
        {"response_id": 1, "score": 85.0, "feedback": "Good structure"},
        {"response_id": 2, "score": 90.0, "feedback": "Excellent analysis"}
    }
    """
    try:
        data = request.get_json()
        if not data or len(data) != 2:
            return jsonify({'error': 'Invalid input: Expected exactly 2 reviews'}), 400
        
        # Validate that the section exists and is a speaking section
        section = db.session.query(Section).filter_by(id=section_id, section_type='writing').first()
        if not section:
            return jsonify({'error': 'Writing section not found'}), 404

        for review in data:
            response_id = review.get('response_id')
            score_value = review.get('score')
            feedback = review.get('feedback')

            # Validate required fields
            if not all([response_id, score_value is not None]):  # Feedback is optional
                return jsonify({'error': f'Missing required fields for response_id {response_id}'}), 400

            # Verify response exists
            response = WritingResponse.query.get(response_id)
            if not response:
                return jsonify({'error': f'Response ID {response_id} not found'}), 404

            # Validate score (assuming 0-100 range)
            if not isinstance(score_value, (int, float)) or score_value < 0 or score_value > 100:
                return jsonify({'error': f'Invalid score {score_value} for response_id {response_id}'}), 400

            # Update or create score
            existing_score = Score.query.filter_by(response_id=response_id, response_type='writing').first()
            if existing_score:
                existing_score.score = score_value
                existing_score.feedback = feedback
                existing_score.scored_by = current_user_id
            else:
                new_score = Score(
                    response_id=response_id,
                    response_type='writing',
                    score=score_value,
                    feedback=feedback,
                    scored_by=current_user_id
                )
                db.session.add(new_score)

        db.session.commit()
        return jsonify({'message': 'Reviews submitted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
    
# Review pages

# === USER REVIEW ENDPOINTS ===

@app.route('/review/summaries', methods=['GET'])
@student_required
def get_user_review_summaries(student_id):
    """Fetches a summary of sections the user has completed."""
    try:
        summaries = []

        # --- Query for SPEAKING sections completed by the user ---
        speaking_sections = db.session.query(Section.id, Section.title)\
            .join(SpeakingTask, Section.id == SpeakingTask.section_id)\
            .join(SpeakingResponse, SpeakingTask.id == SpeakingResponse.task_id)\
            .filter(SpeakingResponse.user_id == student_id)\
            .distinct().all()
        summaries.extend([{'sectionId': s.id, 'sectionTitle': s.title, 'sectionType': 'speaking'} for s in speaking_sections])

        # --- Query for WRITING sections completed by the user ---
        writing_sections = db.session.query(Section.id, Section.title)\
            .join(WritingTask, Section.id == WritingTask.section_id)\
            .join(WritingResponse, WritingTask.id == WritingResponse.task_id)\
            .filter(WritingResponse.user_id == student_id)\
            .distinct().all()
        summaries.extend([{'sectionId': s.id, 'sectionTitle': s.title, 'sectionType': 'writing'} for s in writing_sections])

        # --- Query for READING sections completed by the user ---
        reading_sections = db.session.query(Section.id, Section.title)\
            .join(ReadingPassage, Section.id == ReadingPassage.section_id)\
            .join(Question, ReadingPassage.id == Question.reading_passage_id)\
            .join(UserAnswer, Question.id == UserAnswer.question_id)\
            .filter(UserAnswer.user_id == student_id)\
            .filter(Section.section_type == 'reading')\
            .distinct().all()
        summaries.extend([{'sectionId': s.id, 'sectionTitle': s.title, 'sectionType': 'reading'} for s in reading_sections])

        # --- Query for LISTENING sections completed by the user ---
        listening_sections = db.session.query(Section.id, Section.title)\
            .join(ListeningAudio, Section.id == ListeningAudio.section_id)\
            .join(Question, ListeningAudio.id == Question.listening_audio_id)\
            .join(UserAnswer, Question.id == UserAnswer.question_id)\
            .filter(UserAnswer.user_id == student_id)\
            .filter(Section.section_type == 'listening')\
            .distinct().all()
        summaries.extend([{'sectionId': s.id, 'sectionTitle': s.title, 'sectionType': 'listening'} for s in listening_sections])

        # todo: optimize later
        processed_summaries = []
        processed_section_ids = set()

        for s_type, sections_list in [('speaking', speaking_sections), ('writing', writing_sections), ('reading', reading_sections), ('listening', listening_sections)]:
            for section_info in sections_list:
                section_id = section_info.id
                # Avoid processing the same section ID if it somehow appeared in multiple lists
                if section_id in processed_section_ids:
                    continue
                processed_section_ids.add(section_id)

                # --- Check feedback status ---
                all_feedback_provided = False # Default to false
                try:
                    if s_type == 'speaking':
                        # Check if ALL SpeakingResponses for this user/section have a corresponding Score
                        response_count = db.session.query(db.func.count(SpeakingResponse.id)).join(SpeakingTask).filter(SpeakingTask.section_id == section_id, SpeakingResponse.user_id == student_id).scalar()
                        score_count = db.session.query(db.func.count(Score.id)).join(SpeakingResponse).join(SpeakingTask).filter(SpeakingTask.section_id == section_id, SpeakingResponse.user_id == student_id, Score.response_type == 'speaking').scalar()
                        all_feedback_provided = response_count > 0 and response_count == score_count

                    elif s_type == 'writing':
                        # Check if ALL WritingResponses for this user/section have a corresponding Score
                        response_count = db.session.query(db.func.count(WritingResponse.id)).join(WritingTask).filter(WritingTask.section_id == section_id, WritingResponse.user_id == student_id).scalar()
                        score_count = db.session.query(db.func.count(Score.id)).join(WritingResponse).join(WritingTask).filter(WritingTask.section_id == section_id, WritingResponse.user_id == student_id, Score.response_type == 'writing').scalar()
                        all_feedback_provided = response_count > 0 and response_count == score_count

                    elif s_type in ['reading', 'listening']:
                        # Check if ALL UserAnswers for this user/section have a corresponding Score
                        answer_count = db.session.query(db.func.count(UserAnswer.id)).join(Question).filter(Question.section_id == section_id, UserAnswer.user_id == student_id).scalar()
                        score_count = db.session.query(db.func.count(Score.id)).join(UserAnswer).join(Question).filter(Question.section_id == section_id, UserAnswer.user_id == student_id, Score.response_type == s_type).scalar()
                        all_feedback_provided = answer_count > 0 and answer_count == score_count
                except Exception as check_e:
                    print(f"Warning: Could not determine feedback status for section {section_id}: {check_e}")
                    all_feedback_provided = False # Default to false on error


                processed_summaries.append({
                    'sectionId': section_id,
                    'sectionTitle': section_info.title,
                    'sectionType': s_type,
                    'feedbackProvided': all_feedback_provided # <<< ADDED STATUS
                    # 'completedAt': ... # Add completion date if needed
                })


        # return jsonify(list(unique_summaries)), 200
        return jsonify(processed_summaries), 200

        # return jsonify(summaries), 200

    except Exception as e:
        print(f"Error in /review/summaries: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch review summaries'}), 500


@app.route('/review/<sectionType>/<int:sectionId>', methods=['GET'])
@student_required
def get_user_section_review_details(student_id, sectionType, sectionId):
    """Fetches the user's responses, scores, and feedback for a specific section."""
    try:
        section = db.session.query(Section).filter_by(id=sectionId, section_type=sectionType).first()
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        results = {'sectionId': section.id, 'sectionTitle': section.title, 'sectionType': section.section_type, 'tasks': []}

        if sectionType == 'speaking':
            tasks_query = db.session.query(SpeakingTask)\
                .filter(SpeakingTask.section_id == sectionId)\
                .options(
                    # Load SpeakingResponses related to the SpeakingTask
                    joinedload(SpeakingTask.responses)
                        # THEN, from the loaded SpeakingResponse, load its 'scores' relationship
                        .joinedload(SpeakingResponse.scores)
                        # THEN, from the loaded Score, load its 'scorer' relationship
                        .joinedload(Score.scorer)
                )\
                .order_by(SpeakingTask.task_number)

            tasks = tasks_query.all()

            # --- The rest of the processing logic ---
            # (This part should be correct if copied from the fixed writing version)
            results = {'sectionId': sectionId, 'sectionTitle': '...', 'sectionType': 'speaking', 'tasks': []}
            section = db.session.query(Section.title).filter_by(id=sectionId).first()
            if section: results['sectionTitle'] = section.title
            else: return jsonify({'error': 'Section not found'}), 404

            for task in tasks:
                # Filter in Python to find the specific student's response
                response = next((r for r in task.responses if r.user_id == student_id), None)
                score_data = None
                if response and response.scores:
                    score_rec = response.scores[0] if response.scores else None
                    if score_rec:
                        score_data = {
                            'score': float(score_rec.score) if score_rec.score is not None else None,
                            'feedback': score_rec.feedback,
                            'scorer': score_rec.scorer.username if score_rec.scorer else None
                        }

                results['tasks'].append({
                    'taskId': task.id,
                    'taskNumber': task.task_number,
                    'prompt': task.prompt,
                    'passage': task.passage,
                    'taskAudioUrl': task.audio_url,
                    'response': {
                        'responseId': response.id if response else None,
                        'audioUrl': response.audio_url if response else None,
                    } if response else None,
                    'score': score_data
                })

        elif sectionType == 'writing':
            tasks_query = db.session.query(WritingTask)\
                .filter(WritingTask.section_id == sectionId)\
                .options(
                    # Load ALL responses for the task first
                    joinedload(WritingTask.responses)
                        # THEN, for those responses, load their scores
                        .joinedload(WritingResponse.scores)
                        # THEN, for those scores, load the scorer
                        .joinedload(Score.scorer)
                    # REMOVED: .and_(WritingResponse.user_id == student_id) <<< Make sure this line is gone!
                )\
                .order_by(WritingTask.task_number)

            tasks = tasks_query.all()

            results = {'sectionId': sectionId, 'sectionTitle': '...', 'sectionType': 'writing', 'tasks': []}

            section = db.session.query(Section.title).filter_by(id=sectionId).first()
            if section: results['sectionTitle'] = section.title
            else: return jsonify({'error': 'Section not found'}), 404


            for task in tasks:
                # --- Filter in Python: Find the response for the specific student ---
                response = next((r for r in task.responses if r.user_id == student_id), None)
                # --- End Python Filter ---

                score_data = None
                if response and response.scores:
                    score_rec = response.scores[0] if response.scores else None
                    if score_rec:
                        score_data = {
                            'score': float(score_rec.score) if score_rec.score is not None else None,
                            'feedback': score_rec.feedback,
                            'scorer': score_rec.scorer.username if score_rec.scorer else None
                        }

                results['tasks'].append({
                    'taskId': task.id,
                    'taskNumber': task.task_number,
                    'prompt': task.prompt,
                    'passage': task.passage,
                    'taskAudioUrl': task.audio_url,
                    'response': {
                        'responseId': response.id if response else None,
                        'responseText': response.response_text if response else None,
                        'wordCount': response.word_count if response else None,
                    } if response else None,
                    'score': score_data
                })


        elif sectionType in ['reading', 'listening']:
            # Determine the correct intermediate model and join conditions
            if sectionType == 'reading':
                IntermediateModel = ReadingPassage
                intermediate_fk_on_question = Question.reading_passage_id
                section_fk_on_intermediate = ReadingPassage.section_id
            else: # listening
                IntermediateModel = ListeningAudio
                intermediate_fk_on_question = Question.listening_audio_id
                section_fk_on_intermediate = ListeningAudio.section_id

            # Fetch UserAnswers by joining through the correct path AND filtering correctly
            answers_query = db.session.query(UserAnswer)\
                .join(Question, UserAnswer.question_id == Question.id)\
                .join(IntermediateModel, intermediate_fk_on_question == IntermediateModel.id) \
                .filter(section_fk_on_intermediate == sectionId) \
                .filter(UserAnswer.user_id == student_id) \
                .options( # Eager load everything needed
                    joinedload(UserAnswer.user), # Though filtered, good practice
                    joinedload(UserAnswer.question).options(
                        # Load question context
                        joinedload(Question.options), # Load all options for the question
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.option), # Load correct options
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.table_row), # Load correct table rows
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.table_column), # Load correct table columns
                        joinedload(Question.user_answers.and_(UserAnswer.user_id == student_id)).joinedload(UserAnswer.option), # Load user's selected option
                        joinedload(Question.user_answers.and_(UserAnswer.user_id == student_id)).joinedload(UserAnswer.table_row), # Load user's selected row
                        joinedload(Question.user_answers.and_(UserAnswer.user_id == student_id)).joinedload(UserAnswer.table_column) # Load user's selected col
                    ),
                    # Load user selection details
                    joinedload(UserAnswer.option),
                    joinedload(UserAnswer.table_row),
                    joinedload(UserAnswer.table_column),
                    # Load scores
                    joinedload(UserAnswer.scores).joinedload(Score.scorer)
                )\
                .order_by(Question.id) # Order by Question ID for consistency

            user_answers = answers_query.all()
            user_responses_map = {}

            for ua in user_answers: # 'ua' is the UserAnswer object for the current student/question
                # Ensure the student exists in the map
                if ua.user_id not in user_responses_map:
                    user_responses_map[ua.user_id] = {
                        'student': {'id': ua.user.id, 'name': ua.user.username},
                        'responses': []
                    }

                # Determine user's answer representation *directly from ua*
                user_ans_repr = None
                if ua.option: # Check if the UserAnswer links to an Option
                    user_ans_repr = ua.option.id
                elif ua.table_row and ua.table_column: # Check if it links to table row/col
                    user_ans_repr = {'rowId': ua.table_row_id, 'colId': ua.table_column_id}
                # Add elif for other potential answer storage methods if needed

                # Access the loaded score directly from the UserAnswer's 'scores' relationship
                score_rec = ua.scores[0] if ua.scores else None
                score_data = {
                    'score': float(score_rec.score) if score_rec and score_rec.score is not None else None,
                    'feedback': score_rec.feedback if score_rec else None,
                    'hasFeedback': bool(score_rec) # This status is needed for admin view, maybe not user view
                }

                # Get correct answer (you might need this logic for user view too)
                correct_ans_repr = []
                if ua.question.type in ['multiple_to_single', 'multiple_to_multiple', 'audio']:
                    correct_ans_repr = [ca.option.id for ca in ua.question.correct_answers if ca.option]
                elif ua.question.type == 'table':
                    correct_ans_repr = [{'rowId': ca.table_row_id, 'colId': ca.table_column_id} for ca in ua.question.correct_answers if ca.table_row and ca.table_column]

                # Determine if user's answer was correct
                is_correct = False
                if ua.question.type in ['multiple_to_single', 'audio']:
                    is_correct = user_ans_repr is not None and correct_ans_repr and user_ans_repr == correct_ans_repr[0]
                elif ua.question.type == 'multiple_to_multiple':
                    # We need all user answers for *this specific question* to compare sets
                    # This might require a slightly different query structure if not already loaded correctly
                    # For simplicity, let's assume correctness check might be complex here or done differently
                    pass # Complex comparison needed
                elif ua.question.type == 'table':
                    # Complex comparison needed
                    pass


                # Append the formatted response details
                user_responses_map[ua.user_id]['responses'].append({
                    'responseId': ua.id, # This is UserAnswer.id - Use as 'response.responseId'
                    'taskId': ua.question.id,
                    'taskNumber': ua.question.id, # Or index needed?
                    'prompt': ua.question.prompt,
                    # 'responseType': sectionType, # Not usually needed in UserTaskReview
                    'response': { # Nest response specific details
                        'responseId': ua.id,
                        'userSelection': user_ans_repr,
                        'isCorrect': is_correct
                    },
                    # Context
                    'options': [{'id': o.id, 'text': o.option_text} for o in ua.question.options],
                    'rows': [{'id': r.id, 'label': r.row_label} for r in getattr(ua.question, 'table_rows', [])],
                    'columns': [{'id': c.id, 'label': c.column_label} for c in getattr(ua.question, 'table_columns', [])],
                    'correctAnswer': correct_ans_repr,
                    # Score/Feedback (should match UserTaskReview.score structure)
                    'score': { # Nest score details
                        'score': score_data['score'],
                        'feedback': score_data['feedback'],
                        'scorer': score_rec.scorer.username if score_rec and score_rec.scorer else None
                    } if score_rec else None # Send null if no score record
                })

                submissions_or_tasks_list = list(user_responses_map.values())

                # Decide final return structure. The endpoint is for ONE user,
                # so 'submissions_or_tasks_list' should only have one element.
                if len(submissions_or_tasks_list) > 1:
                    print(f"Warning: Found review data for more than one user ({len(submissions_or_tasks_list)}) for student_id {student_id}")

                final_tasks = submissions_or_tasks_list[0]['responses'] if submissions_or_tasks_list else []

                # Structure the final JSON to match UserSectionReviewDetail
                results['tasks'] = final_tasks # Assign the list of formatted tasks

        return jsonify(results), 200

    except Exception as e:
        print(f"Error in /review/{sectionType}/{sectionId}: {e}")
        import traceback
        traceback.print_exc() # Print full traceback for debugging
        return jsonify({'error': 'Failed to fetch review details'}), 500


# === ADMIN REVIEW ENDPOINTS ===

@app.route('/admin/review/summaries', methods=['GET'])
@admin_required_with_id
def get_admin_review_summaries(admin_id):
    """Fetches summaries of sections with responses for admin review."""
    sectionType = request.args.get('type', 'speaking') # Default to speaking or get from query param
    try:
        query = db.session.query(
                Section.id.label('sectionId'),
                Section.title.label('sectionTitle'),
                db.func.count(db.distinct(User.id)).label('studentCount') # Count distinct users
            ).select_from(Section) 

        if sectionType == 'speaking':
            query = query.join(SpeakingTask, Section.id == SpeakingTask.section_id)\
                         .join(SpeakingResponse, SpeakingTask.id == SpeakingResponse.task_id)\
                         .join(User, SpeakingResponse.user_id == User.id) # <<< Join User via Response
        elif sectionType == 'writing':
            query = query.join(WritingTask, Section.id == WritingTask.section_id)\
                         .join(WritingResponse, WritingTask.id == WritingResponse.task_id)\
                         .join(User, WritingResponse.user_id == User.id) # <<< Join User via Response
        elif sectionType == 'reading':
            query = query.join(ReadingPassage, Section.id == ReadingPassage.section_id)\
                        .join(Question, ReadingPassage.id == Question.reading_passage_id)\
                        .join(UserAnswer, Question.id == UserAnswer.question_id)\
                        .join(User, UserAnswer.user_id == User.id)
        elif sectionType == 'listening':
            query = query.join(ListeningAudio, Section.id == ListeningAudio.section_id)\
                        .join(Question, ListeningAudio.id == Question.listening_audio_id)\
                        .join(UserAnswer, Question.id == UserAnswer.question_id)\
                        .join(User, UserAnswer.user_id == User.id)
        else: 
            return jsonify({'error': 'Invalid section type'}), 400

        # Add filters and grouping AFTER establishing the joins
        query = query.filter(Section.section_type == sectionType)\
                    .group_by(Section.id, Section.title) # Group by the Section columns

        summaries_raw = query.all()

        # summaries_raw = query.filter(Section.section_type == sectionType).group_by(Section.id, Section.title).all()

        # Convert Row objects to dictionaries
        summaries = [row._asdict() for row in summaries_raw]

        for summary in summaries:
            summary['sectionType'] = sectionType

        return jsonify(summaries), 200
    except Exception as e:
        db.session.rollback() 
        print(f"Error in /admin/review/summaries: {e}")
        import traceback
        traceback.print_exc() # Print full traceback for better debugging
        return jsonify({'error': f'Failed to fetch admin review summaries for {sectionType}'}), 500


@app.route('/admin/review/<sectionType>/<int:sectionId>', methods=['GET'])
@admin_required # Assuming admin_required provides admin_id implicitly or via g.user
def get_admin_section_review_details(sectionType, sectionId): # Removed admin_id if not needed directly
    """Fetches all student responses/answers for a specific section for admin review."""
    try:
        section = db.session.query(Section).filter_by(id=sectionId, section_type=sectionType).first()
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        submissions = []
        user_responses_map = {} # Temp map {user_id: {student: {...}, responses: [...]}}

        if sectionType == 'speaking':
            # Fetch SpeakingResponses and eagerly load related data including Scores
            responses_query = db.session.query(SpeakingResponse)\
                .join(SpeakingTask, SpeakingResponse.task_id == SpeakingTask.id)\
                .filter(SpeakingTask.section_id == sectionId)\
                .options(
                    joinedload(SpeakingResponse.user),
                    joinedload(SpeakingResponse.task),
                    joinedload(SpeakingResponse.scores).joinedload(Score.scorer) # Eager load scores and scorer
                )\
                .order_by(SpeakingResponse.user_id, SpeakingTask.task_number)

            responses = responses_query.all()

            for resp in responses:
                if resp.user_id not in user_responses_map:
                     user_responses_map[resp.user_id] = {
                         'student': {'id': resp.user.id, 'name': resp.user.username},
                         'responses': []
                     }
                # Access the loaded score (should be 0 or 1 score object)
                score_rec = resp.scores[0] if resp.scores else None
                score_data = {
                     'score': float(score_rec.score) if score_rec and score_rec.score is not None else None,
                     'feedback': score_rec.feedback if score_rec else None,
                     'hasFeedback': bool(score_rec)
                 }

                user_responses_map[resp.user_id]['responses'].append({
                    'responseId': resp.id, 'taskId': resp.task_id, 'taskNumber': resp.task.task_number,
                    'taskPrompt': resp.task.prompt, 'responseType': 'speaking', 'audioUrl': resp.audio_url,
                    **score_data
                })

        elif sectionType == 'writing':
            # Fetch WritingResponses similarly
            responses_query = db.session.query(WritingResponse)\
                .join(WritingTask, WritingResponse.task_id == WritingTask.id)\
                .filter(WritingTask.section_id == sectionId)\
                .options(
                    joinedload(WritingResponse.user),
                    joinedload(WritingResponse.task),
                    joinedload(WritingResponse.scores).joinedload(Score.scorer)
                )\
                .order_by(WritingResponse.user_id, WritingTask.task_number)

            responses = responses_query.all()
            # Process writing responses (similar logic to speaking)
            for resp in responses:
                 if resp.user_id not in user_responses_map:
                     user_responses_map[resp.user_id] = {
                         'student': {'id': resp.user.id, 'name': resp.user.username},
                         'responses': []
                     }
                 score_rec = resp.scores[0] if resp.scores else None
                 score_data = { 'score': float(score_rec.score) if score_rec and score_rec.score is not None else None, 'feedback': score_rec.feedback if score_rec else None, 'hasFeedback': bool(score_rec)}
                 user_responses_map[resp.user_id]['responses'].append({
                    'responseId': resp.id, 'taskId': resp.task_id, 'taskNumber': resp.task.task_number,
                    'taskPrompt': resp.task.prompt, 'responseType': 'writing', 'responseText': resp.response_text, 'wordCount': resp.word_count,
                    **score_data
                 })


        elif sectionType in ['reading', 'listening']:
            # Determine the correct intermediate model and join condition based on type
            if sectionType == 'reading':
                IntermediateModel = ReadingPassage
                intermediate_fk_on_question = Question.reading_passage_id
                section_fk_on_intermediate = ReadingPassage.section_id
            else: # listening
                IntermediateModel = ListeningAudio
                intermediate_fk_on_question = Question.listening_audio_id
                section_fk_on_intermediate = ListeningAudio.section_id

            # Fetch UserAnswers by joining through the correct path
            answers_query = db.session.query(UserAnswer)\
                .join(Question, UserAnswer.question_id == Question.id)\
                .join(IntermediateModel, intermediate_fk_on_question == IntermediateModel.id) \
                .filter(section_fk_on_intermediate == sectionId) \
                .options( # Eager load everything needed
                    joinedload(UserAnswer.user),
                    joinedload(UserAnswer.question).options(
                        joinedload(Question.options),
                        joinedload(Question.table_rows),
                        joinedload(Question.table_columns),
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.option),
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.table_row),
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.table_column),
                    ),
                    joinedload(UserAnswer.option),
                    joinedload(UserAnswer.table_row),
                    joinedload(UserAnswer.table_column),
                    joinedload(UserAnswer.scores).joinedload(Score.scorer) # Load score via relationship
                )\
                .order_by(UserAnswer.user_id, Question.id) # Order is important for grouping

            user_answers = answers_query.all()

            # --- The rest of the processing logic remains the same ---
            # It correctly groups by user_id and processes each 'ua' in user_answers
            for ua in user_answers:
                if ua.user_id not in user_responses_map:
                    user_responses_map[ua.user_id] = {
                        'student': {'id': ua.user.id, 'name': ua.user.username},
                        'responses': []
                    }

                # Determine user's answer representation (logic as before)
                user_ans_repr = None
                if ua.question.type in ['multiple_to_single', 'multiple_to_multiple', 'audio'] and ua.option:
                    user_ans_repr = ua.option.id
                elif ua.question.type == 'table' and ua.table_row and ua.table_column:
                    user_ans_repr = {'rowId': ua.table_row_id, 'colId': ua.table_column_id}

                # Access the loaded score
                score_rec = ua.scores[0] if ua.scores else None
                score_data = {
                    'score': float(score_rec.score) if score_rec and score_rec.score is not None else None,
                    'feedback': score_rec.feedback if score_rec else None,
                    'hasFeedback': bool(score_rec)
                }

                user_responses_map[ua.user_id]['responses'].append({
                    'responseId': ua.id, # UserAnswer.id
                    'taskId': ua.question.id,
                    'taskNumber': ua.question.id, # Or index
                    'taskPrompt': ua.question.prompt,
                    'responseType': sectionType,
                    'userSelection': user_ans_repr,
                    'options': [{'id': o.id, 'text': o.option_text} for o in ua.question.options],
                    'rows': [{'id': r.id, 'label': r.row_label} for r in getattr(ua.question, 'table_rows', [])],
                    'columns': [{'id': c.id, 'label': c.column_label} for c in getattr(ua.question, 'table_columns', [])],
                    **score_data
                })

        # Convert map to list
        submissions = list(user_responses_map.values())

        return jsonify({
            'sectionId': section.id,
            'sectionTitle': section.title,
            'sectionType': section.section_type,
            'submissions': submissions
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error fetching admin details for {sectionType}/{sectionId}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch admin review details'}), 500


# --- Endpoint to GET details for the feedback form (Handles all types) ---
@app.route('/admin/feedback/<responseType>/<int:responseId>', methods=['GET'])
@admin_required # Use appropriate decorator
def get_feedback_target_details(responseType, responseId): # Removed admin_id if not needed
    """Fetches details of a specific response/answer for the feedback form."""
    try:
        response_data = None
        if responseType == 'speaking':
            resp = db.session.query(SpeakingResponse)\
                .options(joinedload(SpeakingResponse.user),
                         joinedload(SpeakingResponse.task),
                         joinedload(SpeakingResponse.scores).joinedload(Score.scorer))\
                .filter(SpeakingResponse.id == responseId).first()
            if not resp: return jsonify({'error': 'Speaking response not found'}), 404
            score_rec = resp.scores[0] if resp.scores else None
            response_data = { # Structure matches FeedbackTargetDetails type
                'responseId': resp.id, 'responseType': 'speaking',
                'student': {'id': resp.user.id, 'name': resp.user.username},
                'task': {'id': resp.task.id, 'number': resp.task.task_number, 'prompt': resp.task.prompt},
                'audioUrl': resp.audio_url,
                'score': float(score_rec.score) if score_rec and score_rec.score is not None else None,
                'feedback': score_rec.feedback if score_rec else None # Send null or ""? "" is better for form
            }
        elif responseType == 'writing':
            resp = db.session.query(WritingResponse)\
                .options(joinedload(WritingResponse.user),
                         joinedload(WritingResponse.task),
                         joinedload(WritingResponse.scores).joinedload(Score.scorer))\
                .filter(WritingResponse.id == responseId).first()
            if not resp: return jsonify({'error': 'Writing response not found'}), 404
            score_rec = resp.scores[0] if resp.scores else None
            response_data = {
                'responseId': resp.id, 'responseType': 'writing',
                'student': {'id': resp.user.id, 'name': resp.user.username},
                'task': {'id': resp.task.id, 'number': resp.task.task_number, 'prompt': resp.task.prompt},
                'responseText': resp.response_text, 'wordCount': resp.word_count,
                'score': float(score_rec.score) if score_rec and score_rec.score is not None else None,
                'feedback': score_rec.feedback if score_rec else None
            }
        elif responseType in ['reading', 'listening']:
             resp = db.session.query(UserAnswer)\
                .options(
                    joinedload(UserAnswer.user),
                    joinedload(UserAnswer.question).options(
                        joinedload(Question.options), # Load all needed context
                        joinedload(Question.table_rows),
                        joinedload(Question.table_columns),
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.option),
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.table_row),
                        joinedload(Question.correct_answers).joinedload(CorrectAnswer.table_column),
                     ),
                    joinedload(UserAnswer.option),
                    joinedload(UserAnswer.table_row),
                    joinedload(UserAnswer.table_column),
                    joinedload(UserAnswer.scores).joinedload(Score.scorer) # Load score via relationship
                    )\
                .filter(UserAnswer.id == responseId).first()
             if not resp: return jsonify({'error': f'{responseType.capitalize()} answer not found'}), 404

             # Determine user selection and correct answer representations
             user_ans_repr = None
             # ... (logic to determine user_ans_repr) ...
             if resp.question.type in ['multiple_to_single', 'multiple_to_multiple', 'audio'] and resp.option:
                 user_ans_repr = resp.option.id
             elif resp.question.type == 'table' and resp.table_row and resp.table_column:
                 user_ans_repr = {'rowId': resp.table_row_id, 'colId': resp.table_column_id}
             # Add logic for other types

             correct_ans_repr = []
             # ... (logic to determine correct_ans_repr from resp.question.correct_answers) ...
             if resp.question.type in ['multiple_to_single', 'multiple_to_multiple', 'audio']:
                 correct_ans_repr = [ca.option.id for ca in resp.question.correct_answers if ca.option]
             elif resp.question.type == 'table':
                 correct_ans_repr = [{'rowId': ca.table_row_id, 'colId': ca.table_column_id} for ca in resp.question.correct_answers if ca.table_row and ca.table_column]


             score_rec = resp.scores[0] if resp.scores else None
             response_data = {
                 'responseId': resp.id, 'responseType': responseType,
                 'student': {'id': resp.user.id, 'name': resp.user.username},
                 'task': {'id': resp.question.id, 'number': resp.question.id, 'prompt': resp.question.prompt},
                 'userSelection': user_ans_repr,
                 'options': [{'id': o.id, 'text': o.option_text} for o in resp.question.options],
                 'rows': [{'id': r.id, 'label': r.row_label} for r in getattr(resp.question, 'table_rows', [])],
                 'columns': [{'id': c.id, 'label': c.column_label} for c in getattr(resp.question, 'table_columns', [])],
                 'correctAnswer': correct_ans_repr, # Include correct answer for context
                 'score': float(score_rec.score) if score_rec and score_rec.score is not None else None,
                 'feedback': score_rec.feedback if score_rec else None
             }
        else:
            return jsonify({'error': 'Invalid response type'}), 400

        # Ensure feedback is "" if null for form pre-filling
        if response_data and response_data.get('feedback') is None:
            response_data['feedback'] = ""

        return jsonify(response_data), 200
    except Exception as e:
        print(f"Error getting feedback target details: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch response details'}), 500


# --- Endpoint to POST feedback (Handles all types) ---
@app.route('/admin/feedback/<responseType>/<int:responseId>', methods=['POST'])
@admin_required_with_id # Use appropriate decorator that provides admin_id (e.g., via g.user)
def submit_admin_feedback(admin_id, responseType, responseId): # Removed admin_id if provided by decorator context
    """Submits score and feedback for a specific response or answer."""
    # Get admin_id from context (adjust based on your decorator)
    # Example: admin_id = g.user.id
    if not admin_id:
         return jsonify({'error': 'Admin user context not found'}), 500 # Or 401/403

    data = request.get_json()
    if not data: return jsonify({'error': 'Missing JSON data'}), 400

    # Use .get with default None for score, allow score to be omitted or explicitly null
    score_value = data.get('score')
    feedback_text = data.get('feedback', "").strip() # Default to "", trim whitespace

    # Basic validation (more specific validation based on type might be needed)
    if score_value is not None:
        try:
            # Validate score range based on type
            score_value = float(score_value)
            max_score = 5.0 if responseType in ['speaking', 'writing'] else 1.0 # Example max scores
            if not (0 <= score_value <= max_score):
                 raise ValueError(f"Score must be between 0 and {max_score}")
        except (ValueError, TypeError):
             return jsonify({'error': f'Invalid score value: {score_value}'}), 400


    try:
        target_id_column = None
        if responseType in ['speaking', 'writing']:
            target_id_column = Score.response_id
            # Verify original response exists
            model = SpeakingResponse if responseType == 'speaking' else WritingResponse
            if not db.session.query(model.id).filter_by(id=responseId).first():
                return jsonify({'error': f'Original {responseType} response not found'}), 404

        elif responseType in ['reading', 'listening']:
            target_id_column = Score.user_answer_id
            # Verify original answer exists
            if not db.session.query(UserAnswer.id).filter_by(id=responseId).first():
                 return jsonify({'error': f'Original {responseType} answer not found'}), 404
        else:
             return jsonify({'error': 'Invalid response type'}), 400

        # Find existing Score record or create new
        score_rec = db.session.query(Score).filter(
            target_id_column == responseId,
            Score.response_type == responseType # Always filter by type too
        ).first()

        if score_rec:
            # Update existing score
            score_rec.score = score_value
            score_rec.feedback = feedback_text if feedback_text else None # Store null if empty
            score_rec.scored_by = admin_id
            # updated_at will auto-update
        else:
            # Create new score record
            new_score = Score(
                response_type=responseType,
                score=score_value,
                feedback=feedback_text if feedback_text else None,
                scored_by=admin_id
            )
            # Set the correct linking ID
            if responseType in ['speaking', 'writing']:
                new_score.response_id = responseId
            else: # Reading or Listening
                new_score.user_answer_id = responseId

            db.session.add(new_score)
            # If linking UserAnswer via association table:
            if responseType in ['reading', 'listening']:
                ua = db.session.query(UserAnswer).get(responseId)
                if ua:
                    ua.scores.append(new_score) # Append to establish secondary relationship

        db.session.commit()
        return jsonify({'message': 'Feedback submitted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error submitting feedback: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to submit feedback'}), 500


# Create database tables
with app.app_context():
    db.create_all()

# Run the application
if __name__ == '__main__':
    app.run(debug=True)