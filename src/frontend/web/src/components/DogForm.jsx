import { useState } from "react";

export default function DogForm({ onAddDog }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if(name.trim()) {
      onAddDog({ name, time: null });
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        placeholder="Hundename" 
      />
      <button type="submit">Start Zeitmessung</button>
    </form>
  );
}
