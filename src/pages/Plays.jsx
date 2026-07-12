import { plays } from "../data/mockData.js";

export default function Plays() {
  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Partien</p>
          <h1>Was wurde gespielt?</h1>
        </div>
        <button className="button" type="button">
          Partie erfassen
        </button>
      </div>

      <div className="play-list">
        {plays.map((play) => (
          <article className="play-card" key={play.id}>
            <div>
              <span>{new Date(play.date).toLocaleDateString("de-DE")}</span>
              <h2>{play.game}</h2>
              <p>{play.note}</p>
            </div>
            <dl>
              <div>
                <dt>Spieler</dt>
                <dd>{play.players}</dd>
              </div>
              <div>
                <dt>Gewinner</dt>
                <dd>{play.winner}</dd>
              </div>
              <div>
                <dt>Dauer</dt>
                <dd>{play.duration} Min.</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
