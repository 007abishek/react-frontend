export interface GithubUser {
  login: string;
  avatar_url: string;
  html_url: string;
  followers?: number;
  following?: number;
  public_repos?: number;
}

export interface GithubRepo {
  id: number;
  name: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
  };
}

export interface GithubUserSearchResponse {
  items: GithubUser[];
}

export interface GithubRepoSearchResponse {
  items: GithubRepo[];
}
