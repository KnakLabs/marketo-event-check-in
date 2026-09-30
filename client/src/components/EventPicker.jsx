import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { api } from "../api.js";
import logo from "../assets/knak-logo-white.svg";

// A generic Marketo folder browser: starts at MARKETO_ROOT_FOLDER_ID (server
// side) and lets staff click their way down through subfolders to the
// program they want. Deliberately doesn't assume any particular
// folder-naming convention — that was the whole problem with the old
// "guess the latest quarter folder" picker it replaced.
export default function EventPicker({ onSelect, onCancel, currentProgramId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [path, setPath] = useState([]); // [{ id, name }, ...] from root to current folder
  const [subfolders, setSubfolders] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [query, setQuery] = useState("");

  async function loadFolder(id, nextPath) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFolder({ id });
      setSubfolders(data.subfolders);
      setPrograms(data.programs);
      setPath(nextPath ?? [{ id: data.folder.id, name: data.folder.name }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Opening the picker from an already-loaded event should land wherever
  // that program actually lives, breadcrumbs and all — not dump the user
  // back at the root folder they browsed through minutes ago.
  async function loadForCurrentProgram(programId) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFolder({ programId });
      setSubfolders(data.subfolders);
      setPrograms(data.programs);
      setPath(data.path);
    } catch {
      // The program may have moved or been deleted since it was loaded —
      // fall back to root rather than leaving the picker stuck on an error.
      await loadFolder(undefined);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentProgramId) loadForCurrentProgram(currentProgramId);
    else loadFolder(undefined);
  }, []);

  const currentFolder = path[path.length - 1] || null;

  function openSubfolder(folder) {
    setQuery("");
    loadFolder(folder.id, [...path, { id: folder.id, name: folder.name }]);
  }

  function openBreadcrumb(index) {
    setQuery("");
    loadFolder(path[index].id, path.slice(0, index + 1));
  }

  function refresh() {
    if (currentFolder) loadFolder(currentFolder.id, path);
  }

  const folderFuse = useMemo(
    () => new Fuse(subfolders, { keys: ["name"], threshold: 0.35, ignoreLocation: true }),
    [subfolders]
  );
  const programFuse = useMemo(
    () => new Fuse(programs, { keys: ["name"], threshold: 0.35, ignoreLocation: true }),
    [programs]
  );

  const filteredFolders = query.trim() ? folderFuse.search(query).map((r) => r.item) : subfolders;
  const filteredPrograms = query.trim() ? programFuse.search(query).map((r) => r.item) : programs;

  return (
    <div className="app">
      <header className="header">
        <div className="header__row">
          <img className="header__logo" src={logo} alt="Knak" />
          <div className="header__event">
            <div className="header__event-name">Choose an event</div>
            <div className="header__event-sub">
              {path.length
                ? path.map((crumb, i) => (
                    <span key={crumb.id}>
                      {i > 0 && " / "}
                      {i === path.length - 1 ? (
                        crumb.name
                      ) : (
                        <a
                          href="#"
                          className="breadcrumb-link"
                          onClick={(e) => { e.preventDefault(); openBreadcrumb(i); }}
                        >
                          {crumb.name}
                        </a>
                      )}
                    </span>
                  ))
                : loading
                ? "Loading folders…"
                : ""}
            </div>
          </div>
        </div>
        <div className="header__actions">
          <button className="btn btn--secondary btn--sm" onClick={refresh} disabled={loading}>
            ⟳ Refresh
          </button>
          {onCancel && (
            <button className="btn btn--ghost btn--sm" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </header>

      <div className="search">
        <div className="search__input-wrap">
          <span className="search__icon">⌕</span>
          <input
            className="search__input"
            placeholder="Search this folder…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="list">
        {loading && <div className="empty">Loading…</div>}
        {error && <div className="empty">{error}</div>}
        {!loading && !error && filteredFolders.length === 0 && filteredPrograms.length === 0 && (
          <div className="empty">Nothing here matches.</div>
        )}

        {!loading &&
          !error &&
          filteredFolders.map((folder) => (
            <button
              key={`folder-${folder.id}`}
              className="person"
              style={{ width: "100%", textAlign: "left", border: "1px solid var(--line)", cursor: "pointer" }}
              onClick={() => openSubfolder(folder)}
            >
              <div className="person__avatar">📁</div>
              <div className="person__info">
                <div className="person__name">{folder.name}</div>
                <div className="person__meta">Folder</div>
              </div>
            </button>
          ))}

        {!loading &&
          !error &&
          filteredPrograms.map((program) => (
            <button
              key={`program-${program.id}`}
              className="person"
              style={{ width: "100%", textAlign: "left", border: "1px solid var(--line)", cursor: "pointer" }}
              onClick={() => onSelect(program)}
            >
              <div className="person__avatar">{program.name.slice(0, 2).toUpperCase()}</div>
              <div className="person__info">
                <div className="person__name">{program.name}</div>
                <div className="person__meta">Program {program.id}</div>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
