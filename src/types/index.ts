export type Profile = {
  id: string;
  display_name: string;
};

export type Thing = {
  id: string;
  name: string;
  brand: string | null;
  product_url: string | null;
  original_image_url: string | null;
  processed_image_url: string | null;
  memo: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  profiles?: Profile | null;
};

export type Place = {
  id: string;
  name: string;
  visited_date: string;
  image_url: string | null;
  memo: string | null;
  created_by: string;
  created_at: string;
  profiles?: Profile | null;
};

export type Book = {
  id: string;
  title: string;
  author: string | null;
  status: "reading" | "finished";
  image_url: string | null;
  memo: string | null;
  created_by: string;
  created_at: string;
  profiles?: Profile | null;
};

export type Sound = {
  id: string;
  title: string;
  artist: string | null;
  image_url: string | null;
  url: string | null;
  memo: string | null;
  created_by: string;
  created_at: string;
  profiles?: Profile | null;
};

export type Podcast = Sound;

export type PostPhoto = {
  id: string;
  post_id: string;
  image_url: string;
  sort_order: number;
};

export type Post = {
  id: string;
  body: string;
  title?: string | null;
  entry_date: string;
  created_by: string;
  created_at: string;
  post_photos?: PostPhoto[];
  profiles?: Profile | null;
};

export type MoviePhoto = {
  id: string;
  movie_id: string;
  image_url: string;
  sort_order: number;
};

export type Movie = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  entry_date: string;
  created_by: string;
  created_at: string;
  movie_photos?: MoviePhoto[];
  profiles?: Profile | null;
};

export type Work = {
  id: string;
  title: string;
  period_label: string | null;
  summary: string | null;
  created_by: string;
  created_at: string;
  profiles?: Profile | null;
};

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string;
};
