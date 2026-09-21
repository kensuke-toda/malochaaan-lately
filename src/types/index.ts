export type Thing = {
  id: string;
  name: string;
  brand: string | null;
  product_url: string | null;
  original_image_url: string | null;
  processed_image_url: string | null;
  memo: string | null;
  sort_order: number;
  created_at: string;
};

export type DiaryPhoto = {
  id: string;
  diary_entry_id: string;
  image_url: string;
  sort_order: number;
};

export type DiaryEntry = {
  id: string;
  title: string;
  body: string | null;
  entry_date: string;
  created_at: string;
  diary_photos?: DiaryPhoto[];
};
