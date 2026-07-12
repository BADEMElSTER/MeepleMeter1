import { games } from "../data/mockData.js";

export default function Games() {
  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Sammlung</p>
          <h1>Deine Spiele.</h1>
        </div>
        <button className="button" type="button">
          Spiel hinzufügen
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Spiel</th>
              <th>Kategorie</th>
              <th>Spieler</th>
              <th>Dauer</th>
              <th>Partien</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>
                  <strong>{game.title}</strong>
                </td>
                <td>{game.category}</td>
                <td>{game.players}</td>
                <td>{game.duration} Min.</td>
                <td>{game.plays}</td>
                <td>{game.rating.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
