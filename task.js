//Task object used on todo page
function Task(id, name, owner, creator, done, cleared) {
    this.id = id;
    this.name = name;
    this.owner = owner;
    this.creator = creator;
    this.done = done;
    this.cleared = cleared;
}

module.exports = Task; 
