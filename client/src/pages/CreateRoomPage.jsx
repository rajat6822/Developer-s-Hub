import { useState } from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ErrorMessage from "../components/ui/ErrorMessage";
import Input from "../components/ui/Input";
import PageContainer from "../components/ui/PageContainer";
import { createRoom, getFriendlyApiError } from "../utils/api";
import { saveRoomUsername } from "../utils/session";

export default function CreateRoomPage({ navigate }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError("Username is required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await createRoom(trimmedUsername);
      saveRoomUsername(result.roomCode, trimmedUsername);
      navigate(`/room/${encodeURIComponent(result.roomCode)}`);
    } catch (apiError) {
      setError(
        getFriendlyApiError(apiError, "Unable to create a room right now."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <PageContainer className="form-page" navigate={navigate}>
      <section className="auth-layout">
        <div className="auth-copy motion-in">
          <p className="eyebrow">Start a session</p>
          <h1>Create Room</h1>
          <p className="page-description">
            Open a focused coding space and invite teammates into the same live
            document.
          </p>
          <div className="auth-note">
            <span />
            <p>Your username becomes the room host identity.</p>
          </div>
        </div>

        <Card className="form-card motion-in">
          <form className="stacked-form" onSubmit={handleSubmit}>
            <Input
              autoComplete="name"
              error={error === "Username is required." ? error : ""}
              id="create-username"
              label="Username"
              onChange={setUsername}
              placeholder="Alex"
              value={username}
            />
            <ErrorMessage>
              {error !== "Username is required." ? error : ""}
            </ErrorMessage>
            <Button isLoading={isSubmitting} type="submit">
              {isSubmitting ? "Creating room" : "Create Room"}
            </Button>
          </form>
        </Card>
      </section>
    </PageContainer>
  );
}
