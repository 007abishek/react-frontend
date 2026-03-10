import { useEffect, useState } from "react";

import { fetchProductById, fetchProducts } from "./hasuraCommerce";
import type { Product } from "./types";

export function useGetProductsQuery(): {
  data?: Product[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
} {
  const [data, setData] = useState<Product[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(undefined);

    void fetchProducts()
      .then((products) => {
        if (!active) return;
        setData(products);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
  };
}

export function useGetProductByIdQuery(
  id: number,
  options?: { skip?: boolean }
): {
  data?: Product | null;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
} {
  const [data, setData] = useState<Product | null>();
  const [isLoading, setIsLoading] = useState(!(options?.skip ?? false));
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;

    if (options?.skip ?? false) {
      setIsLoading(false);
      setData(undefined);
      setError(undefined);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setError(undefined);

    void fetchProductById(id)
      .then((product) => {
        if (!active) return;
        setData(product);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, options?.skip]);

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
  };
}
