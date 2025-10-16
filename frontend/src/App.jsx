import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// MUI
import {
  ThemeProvider,
  createTheme,
  responsiveFontSizes,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Box,
  Stack,
  TextField,
  Button,
  Chip,
  Card,
  CardContent,
  Alert,
  Divider,
  Skeleton,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  MenuBook as MenuBookIcon,
  ChatBubbleOutline as ChatIcon,
  Bolt as BoltIcon,
  DarkMode as DarkIcon,
  LightMode as LightIcon,
} from "@mui/icons-material";

export default function App() {
  // -------------------- state --------------------
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------- examples --------------------
  const examples = useMemo(
    () => [
      'What does "guapo" mean?',
      "How to pronounce Ñ?",
      "What comes after nosotros?",
      "Break down the word arquitecto",
      "Give 3 sentences using este/esta",
    ],
    []
  );

  // -------------------- theme (light/dark) --------------------
  const prefersLight =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)").matches;

  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("theme-mode");
    if (saved === "light" || saved === "dark") return saved;
    return prefersLight ? "light" : "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme-mode", mode);
  }, [mode]);

  let theme = useMemo(
    () =>
      responsiveFontSizes(
        createTheme({
          palette: {
            mode,
            primary: { main: mode === "light" ? "#3f67ff" : "#7aa2ff" },
            secondary: { main: mode === "light" ? "#12b1cf" : "#4dd0e1" },
            background: {
              default: mode === "light" ? "#f6f7fb" : "#0f1220",
              paper: mode === "light" ? "#ffffff" : "#151934",
            },
          },
          shape: { borderRadius: 14 },
          typography: {
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
            // Scales nicely across device sizes
            h3: { fontWeight: 800 },
            h5: { fontWeight: 700 },
            body1: { lineHeight: 1.65 },
          },
          components: {
            MuiTextField: {
              defaultProps: { variant: "outlined", fullWidth: true },
            },
            MuiButton: {
              styleOverrides: {
                root: { textTransform: "none", fontWeight: 700 },
              },
            },
            MuiChip: {
              styleOverrides: {
                root: { borderRadius: 999 },
              },
            },
          },
        })
      ),
    [mode]
  );

  // -------------------- submit --------------------
  async function onSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const resp = await fetch("/.netlify/functions/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      const ct = resp.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      if (!resp.ok)
        throw new Error(data?.error || data?.detail || "Request failed");
      setAnswer(data.answer || "");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* App Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: "saturate(140%) blur(8px)",
          borderBottom: (t) =>
            `1px solid ${t.palette.mode === "light" ? "#e7e9f3" : "#24294a"}`,
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 2,
              background: (t) =>
                `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
              mr: 1,
              boxShadow:
                mode === "light"
                  ? "0 8px 16px rgba(63,103,255,.15)"
                  : "0 8px 16px rgba(122,162,255,.20)",
            }}
          >
            <MenuBookIcon sx={{ color: "#fff" }} />
          </Box>

          <Typography component="h1" variant="h5" sx={{ flexGrow: 1 }}>
            Spanish Professor
          </Typography>

          <Tooltip
            title={
              mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <IconButton
              color="inherit"
              onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
            >
              {mode === "dark" ? <LightIcon /> : <DarkIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Main container */}
      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
        {/* Intro */}
        <Box textAlign="center" mb={3}>
          <Typography
            variant="h3"
            sx={{ fontSize: { xs: 28, sm: 34, md: 42 } }}
          >
            Learn Spanish the friendly way
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 1, maxWidth: 720, mx: "auto" }}
          >
            Beginner Spanish explained in English. Ask about words, grammar, or
            pronunciation.
          </Typography>

          {/* Example chips */}
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            justifyContent="center"
            sx={{ mt: 2 }}
          >
            {examples.map((ex) => (
              <Chip
                key={ex}
                label={ex}
                variant="outlined"
                onClick={() => setQuery(ex)}
                sx={{
                  borderColor: "divider",
                  color: "text.secondary",
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "text.primary",
                  },
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Search Card */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            backgroundImage: (t) =>
              `linear-gradient(180deg, ${
                t.palette.mode === "light"
                  ? "rgba(0,0,0,0.02)"
                  : "rgba(255,255,255,0.02)"
              } , transparent 60%)`,
          }}
        >
          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: { xs: 1, sm: 1.5 },
              }}
            >
              <ChatIcon color="primary" sx={{ opacity: 0.9 }} />
              <TextField
                placeholder='Ask something like: "What does guapo mean?"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                inputProps={{ "aria-label": "Ask a Spanish question" }}
              />
            </Box>

            <Button
              type="submit"
              size="large"
              disabled={loading || !query.trim()}
              variant="contained"
              startIcon={!loading ? <BoltIcon /> : null}
              sx={{
                px: 3,
                py: 1.25,
                borderRadius: 2,
                fontWeight: 800,
              }}
            >
              {loading ? "Thinking…" : "Ask"}
            </Button>
          </Box>
        </Paper>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <Card variant="outlined" sx={{ mt: 3, borderRadius: 3 }}>
            <CardContent>
              <Skeleton variant="text" height={28} width="25%" />
              <Divider sx={{ my: 1.5 }} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} width="90%" />
              <Skeleton variant="text" height={20} width="70%" />
            </CardContent>
          </Card>
        )}

        {/* Answer */}
        {!loading && answer && (
          <Card
            variant="outlined"
            sx={{
              mt: 3,
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: (t) =>
                t.palette.mode === "light"
                  ? "0 10px 24px rgba(14,24,49,.08)"
                  : "0 10px 30px rgba(0,0,0,.35)",
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.25}
                mb={1.5}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    background: (t) =>
                      `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
                    boxShadow:
                      mode === "light"
                        ? "0 8px 16px rgba(63,103,255,.15)"
                        : "0 8px 16px rgba(122,162,255,.20)",
                  }}
                >
                  <MenuBookIcon sx={{ color: "#fff" }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Answer
                </Typography>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* Markdown-rendered answer */}
              <Box
                sx={{
                  "& h1, & h2, & h3": {
                    color: "primary.light",
                    mt: 2,
                    fontWeight: 700,
                  },
                  "& table": {
                    width: "100%",
                    borderCollapse: "collapse",
                    my: 1,
                  },
                  "& th, & td": {
                    border: (t) => `1px solid ${t.palette.divider}`,
                    p: 1,
                    textAlign: "left",
                  },
                  "& code": {
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: (t) =>
                      t.palette.mode === "light" ? "grey.100" : "grey.900",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                  },
                  "& blockquote": {
                    borderLeft: (t) => `4px solid ${t.palette.primary.main}`,
                    bgcolor: (t) =>
                      t.palette.mode === "light"
                        ? "grey.50"
                        : "rgba(255,255,255,.05)",
                    p: 1.2,
                    borderRadius: 1,
                    color: "text.secondary",
                    my: 1,
                  },
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {answer}
                </ReactMarkdown>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !answer && !error && (
          <Box textAlign="center" py={{ xs: 6, sm: 8 }}>
            <Box
              sx={{
                display: "inline-grid",
                placeItems: "center",
                width: 84,
                height: 84,
                borderRadius: 4,
                mb: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: (t) =>
                  t.palette.mode === "light"
                    ? "grey.50"
                    : "rgba(255,255,255,.04)",
              }}
            >
              <ChatIcon color="primary" sx={{ opacity: 0.7, fontSize: 40 }} />
            </Box>
            <Typography variant="h6" gutterBottom>
              Ready to learn Spanish?
            </Typography>
            <Typography color="text.secondary">
              Type your question above or click on an example to get started!
            </Typography>
          </Box>
        )}

        {/* Footer */}
        <Box
          component="footer"
          mt={{ xs: 4, sm: 6 }}
          pt={3}
          textAlign="center"
          sx={{ borderTop: (t) => `1px solid ${t.palette.divider}` }}
        >
          <Typography variant="body2" color="text.secondary">
            Powered by Groq · LLaMA 3
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
