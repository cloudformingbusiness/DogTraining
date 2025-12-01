export default function TimerList({ dogs }) {
  return (
    <ul>
      {dogs.map((dog, index) => (
        <li key={index}>
          {dog.name} - {dog.time ? `${dog.time}s` : "läuft..."}
        </li>
      ))}
    </ul>
  );
}
