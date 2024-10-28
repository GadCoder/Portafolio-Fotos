import { useState } from "react";
import FadeLoader from "react-spinners/FadeLoader";

export default function Photo({ src }: { src: string }) {
  let [loading, setLoading] = useState(true);
  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "auto",
    objectFit: "cover",
  };
  return (
    <div className="flex  justify-center">
      {loading && <FadeLoader color="#36d7b7" className="m-3" />}
      <img
        src={src}
        width={0}
        height={0}
        sizes="100vw"
        style={imageStyle}
        loading="lazy"
        className="mb-6 rounded"
        onLoad={() => {
          setLoading(false);
        }}
      />
    </div>
  );
}
