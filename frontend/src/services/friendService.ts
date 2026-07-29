import { apiClient } from "../lib/apiClient";
import { FRIEND_ENDPOINTS, LEADERBOARD_ENDPOINTS } from "../constants/api";
import type { ApiEnvelope } from "../types/auth";
import type {
  Friend,
  FriendRequest,
  LeaderboardEntry,
  UserSearchResult,
} from "../types/friend";

/** Friends + leaderboard API. Unwraps the backend `{ success, message, data }` envelope. */
export const friendService = {
  async searchUser(username: string): Promise<UserSearchResult> {
    const { data } = await apiClient.get<ApiEnvelope<UserSearchResult>>(
      FRIEND_ENDPOINTS.search(username),
    );
    return data.data;
  },

  async sendRequest(toUsername: string): Promise<void> {
    await apiClient.post(FRIEND_ENDPOINTS.REQUEST, { to_username: toUsername });
  },

  async acceptRequest(requestId: string): Promise<void> {
    await apiClient.put(FRIEND_ENDPOINTS.accept(requestId));
  },

  async declineRequest(requestId: string): Promise<void> {
    await apiClient.put(FRIEND_ENDPOINTS.decline(requestId));
  },

  async getFriends(): Promise<Friend[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ friends: Friend[] }>>(
      FRIEND_ENDPOINTS.LIST,
    );
    return data.data.friends;
  },

  async getPendingRequests(): Promise<FriendRequest[]> {
    const { data } = await apiClient.get<
      ApiEnvelope<{ requests: FriendRequest[] }>
    >(FRIEND_ENDPOINTS.REQUESTS);
    return data.data.requests;
  },

  async nudge(userId: string): Promise<void> {
    await apiClient.post(FRIEND_ENDPOINTS.nudge(userId));
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data } = await apiClient.get<
      ApiEnvelope<{ leaderboard: LeaderboardEntry[] }>
    >(LEADERBOARD_ENDPOINTS.WEEKLY);
    return data.data.leaderboard;
  },
};
