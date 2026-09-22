// Quiz.jsx
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import './Quiz.css'

const api = axios.create({ baseURL: 'http://localhost:3000' });

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function Quiz() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});   // { questionId: optionIndex }
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(600);
  const [result, setResult] = useState(null);

  const sessionRef = useRef('');     // session token from the backend
  const submittedRef = useRef(false);

  // start session + load questions + start the 10 min timer in main
  useEffect(() => {
    async function init() {
      const [startRes, mcqRes] = await Promise.all([
        api.post('/exam/start', { userId: 'student-101', name: 'Student' }),
        api.get('/exam/mcq'),
      ]);
      sessionRef.current = startRes.data.sessionId;
      setQuestions(mcqRes.data);
      setRemaining(await window.athena.startTimerOnMain());
    }
    init().catch((error) => console.error('Failed to start exam', error));
  }, []);

  async function submit() {
    if (submittedRef.current || !sessionRef.current) return;
    submittedRef.current = true;
    try {
      const response = await api.post('/exam/submit', { sessionId: sessionRef.current });
      setResult(response.data.result);
    } catch (error) {
      console.error('Failed to submit exam', error);
      submittedRef.current = false;
    }
  }

  // ticks come from the electron main process, time over -> auto submit
  useEffect(() => window.athena.registerListenerForTimerTickFromMain((seconds) => {
    setRemaining(seconds);
    if (seconds <= 0) submit();
  }), []);

  async function selectOption(questionId, optionIndex) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    try {
      await api.post('/exam/answer', {
        sessionId: sessionRef.current,
        questionId,
        selectedAnswer: optionIndex,
      });
    } catch (error) {
      console.error('Failed to save answer', error);
    }
  }

  if (result) {
    return (
      <div className="quiz-result">
        <h2>Exam submitted</h2>
        <p>Attempted: {result.attempted} / {result.total}</p>
        <p>Correct: {result.correct}</p>
        <p>Wrong: {result.wrong}</p>
        <button className="btn" onClick={() => window.athena.quitApp()}>Quit App</button>
      </div>
    );
  }

  if (!questions.length) return <div className="quiz-result">Loading exam...</div>;

  const current = questions[index];

  return (
    <div className="quiz">
      <aside className="quiz-side">
        <div className="quiz-timer">{formatTime(remaining)}</div>
        <div className="quiz-palette">
          {questions.map((question, i) => (
            <button
              key={question.id}
              className={
                'quiz-num' +
                (answers[question.id] !== undefined ? ' done' : '') +
                (i === index ? ' active' : '')
              }
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </aside>

      <main className="quiz-main">
        <h3>Question {index + 1} of {questions.length}</h3>
        <p className="quiz-question">{current.question}</p>

        <div className="quiz-options">
          {current.options.map((option, optionIndex) => (
            <label key={optionIndex} className="quiz-option">
              <input
                type="radio"
                name={`question-${current.id}`}
                checked={answers[current.id] === optionIndex}
                onChange={() => selectOption(current.id, optionIndex)}
              />
              {option}
            </label>
          ))}
        </div>

        <div className="quiz-nav">
          <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            Previous
          </button>
          {index === questions.length - 1 ? (
            <button className=" btn-primary" onClick={submit}>Submit</button>
          ) : (
            <button className="btn" onClick={() => setIndex(index + 1)}>Next</button>
          )}
        </div>
      </main>
    </div>
  );
}

export default Quiz

