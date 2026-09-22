const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const questionsPath = path.join(__dirname, "data", "questions.json");
const sessionsPath = path.join(__dirname, "data", "sessions.json");

function readQuestions() {
  return JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
}

function readSessions() {
  return JSON.parse(fs.readFileSync(sessionsPath, "utf-8"));
}

function saveSessions(sessions) {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
}

function makeSessionId() {
  return `session-${Date.now()}`;
}

function questionForStudent(question) {
  return {
    id: question.id,
    question: question.question,
    options: question.options,
  };
}

app.get("/", (req, res) => {
  res.json({ message: "Exam backend is running" });
});

// Start a new exam session
app.post("/exam/start", (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({
      message: "userId and name are required",
    });
  }

  const sessions = readSessions();

  const session = {
    sessionId: makeSessionId(),
    userId,
    name,
    startedAt: new Date().toISOString(),
    submittedAt: null,
    status: "in-progress",
    attempted: 0,
    correct: 0,
    wrong: 0,
    answers: [],
  };

  sessions.push(session);
  saveSessions(sessions);

  res.status(201).json({
    message: "Exam session started",
    sessionId: session.sessionId,
  });
});

// Get one question
app.get("/exam/mcq/:id", (req, res) => {
  const questions = readQuestions();
  const id = Number(req.params.id);

  const question = questions.find((item) => item.id === id);

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(questionForStudent(question));
});

// Get all questions without correct answers
app.get("/exam/mcq", (req, res) => {
  const questions = readQuestions();
  res.json(questions.map(questionForStudent));
});

// Save one answer (no grading here, checked on submit)
app.post("/exam/answer", (req, res) => {
  const { sessionId, questionId, selectedAnswer } = req.body;

  if (!sessionId || questionId === undefined || selectedAnswer === undefined) {
    return res.status(400).json({
      message: "sessionId, questionId and selectedAnswer are required",
    });
  }

  const questions = readQuestions();
  const sessions = readSessions();

  const question = questions.find((item) => item.id === Number(questionId));

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const session = sessions.find((item) => item.sessionId === sessionId);

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  if (session.status !== "in-progress") {
    return res.status(400).json({ message: "Exam is already submitted" });
  }

  const existing = session.answers.find(
    (answer) => answer.questionId === question.id
  );

  if (existing) {
    existing.selectedAnswer = Number(selectedAnswer);
    existing.answeredAt = new Date().toISOString();
  } else {
    session.answers.push({
      questionId: question.id,
      selectedAnswer: Number(selectedAnswer),
      answeredAt: new Date().toISOString(),
    });
  }

  session.attempted = session.answers.length;

  saveSessions(sessions);

  res.json({ message: "Answer saved", attempted: session.attempted });
});

// Get current session progress
app.get("/exam/session/:sessionId", (req, res) => {
  const sessions = readSessions();

  const session = sessions.find(
    (item) => item.sessionId === req.params.sessionId
  );

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  res.json(session);
});

// Submit the whole exam and grade every saved answer
app.post("/exam/submit", (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" });
  }

  const questions = readQuestions();
  const sessions = readSessions();

  const session = sessions.find((item) => item.sessionId === sessionId);

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  if (session.status === "submitted") {
    return res.json({
      message: "Exam already submitted",
      result: {
        total: questions.length,
        attempted: session.attempted,
        correct: session.correct,
        wrong: session.wrong,
      },
    });
  }

  let correct = 0;

  session.answers.forEach((answer) => {
    const question = questions.find((item) => item.id === answer.questionId);
    answer.isCorrect = !!question && answer.selectedAnswer === question.correctAnswer;
    if (answer.isCorrect) correct += 1;
  });

  session.attempted = session.answers.length;
  session.correct = correct;
  session.wrong = session.attempted - correct;
  session.status = "submitted";
  session.submittedAt = new Date().toISOString();

  saveSessions(sessions);

  res.json({
    message: "Exam submitted successfully",
    result: {
      total: questions.length,
      attempted: session.attempted,
      correct: session.correct,
      wrong: session.wrong,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Exam backend running at http://localhost:${PORT}`);
});
