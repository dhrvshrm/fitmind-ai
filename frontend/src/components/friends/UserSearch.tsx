import { useState, type FormEvent } from "react";
import {
  Avatar,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { PersonSearchRounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import { friendService } from "../../services/friendService";
import { isNotFoundError, resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import type { UserSearchResult } from "../../types/friend";
import { userSearchStyles as styles } from "./UserSearch.styles";

const S = STRINGS.friends.search;

/** Search by username; the result card offers the right action for the friendship state. */
export function UserSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<UserSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const username = query.trim();
    if (!username) return;

    setIsSearching(true);
    setError(null);
    setResult(null);
    try {
      setResult(await friendService.searchUser(username));
    } catch (err) {
      setError(
        isNotFoundError(err) ? S.notFound : resolveApiError(err, S.error),
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddFriend() {
    if (!result) return;
    setIsRequesting(true);
    try {
      await friendService.sendRequest(result.username);
      toast.success(S.requestSent);
      // Optimistic: flips the button to "pending" without a re-search.
      setResult({ ...result, friendship_status: "pending" });
    } catch (err) {
      toast.error(resolveApiError(err, S.requestError));
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      <Stack component="form" onSubmit={handleSearch} sx={styles.form}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={S.placeholder}
          size="small"
          fullWidth
          disabled={isSearching}
          sx={styles.field}
        />
        <IconButton
          type="submit"
          aria-label={S.searchAria}
          color="primary"
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? (
            <CircularProgress size={20} />
          ) : (
            <PersonSearchRounded />
          )}
        </IconButton>
      </Stack>

      {error && (
        <Typography variant="body2" color="text.secondary" sx={styles.hint}>
          {error}
        </Typography>
      )}

      {result && (
        <Stack sx={styles.resultRow}>
          <Avatar sx={styles.avatar}>
            {result.username[0]?.toUpperCase()}
          </Avatar>
          <Stack sx={styles.resultBody}>
            <Typography sx={styles.username}>{result.username}</Typography>
            <Typography variant="caption" color="text.secondary">
              {STRINGS.friends.list.level(result.level)}
            </Typography>
          </Stack>

          {result.friendship_status === "none" && (
            <Button
              variant="contained"
              size="small"
              onClick={handleAddFriend}
              disabled={isRequesting}
            >
              {S.addFriend}
            </Button>
          )}
          {result.friendship_status !== "none" && (
            <Chip
              label={S.statusLabels[result.friendship_status]}
              size="small"
              color={
                result.friendship_status === "accepted" ? "success" : "default"
              }
              variant="outlined"
            />
          )}
        </Stack>
      )}
    </Paper>
  );
}
