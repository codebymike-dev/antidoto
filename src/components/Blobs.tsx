export default function Blobs() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "#80DCFF",
          opacity: 0.5,
          filter: "blur(60px)",
          animation: "blobMove1 9s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -140,
          left: -120,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "#3BC8F3",
          opacity: 0.25,
          filter: "blur(70px)",
          animation: "blobMove2 11s ease-in-out infinite",
        }}
      />
    </>
  );
}
