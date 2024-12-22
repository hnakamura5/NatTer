import Skeleton, { SkeletonTheme, SkeletonProps } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { useTheme } from "@/AppState";

export function LoadingSkeleton(props: SkeletonProps) {
  const theme = useTheme();
  return (
    <SkeletonTheme
      baseColor={theme.system.loadingBaseColor}
      highlightColor={theme.system.loadingHighlightColor}
    >
      <Skeleton {...props} />
    </SkeletonTheme>
  );
}
