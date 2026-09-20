export default function Blobs() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "-15vh",
          right: -100,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "#80DCFF",
          opacity: 0.5,
          filter: "blur(60px)",
          animation: "blobMove1 24s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15vh",
          left: -120,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "#3BC8F3",
          opacity: 0.25,
          filter: "blur(70px)",
          animation: "blobMove2 28s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "42vh",
          left: "50%",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "#1C99CA",
          opacity: 0.18,
          filter: "blur(65px)",
          animation: "blobMove3 32s ease-in-out infinite",
          animationDelay: "-9s",
        }}
      />
    </>
  );
}
