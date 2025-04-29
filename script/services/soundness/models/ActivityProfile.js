export class ActivityProfile {
<<<<<<< HEAD
    constructor(source, sink, activities = [], duration = 0) {
        this.source = source;
        this.sink = sink;
        this.activities = activities; // Array of activities
        this.duration = duration; // Number of time steps k needed to complete this activity from source to sink.
    }

    addActivity(edge, timeStep) {
        console.log(`Adding activity (${edge.from.name}, ${edge.to.name}) at time step ${timeStep}`); // Debug: Adding activity
=======
    constructor(source, sink) {
        this.source = source;
        this.sink = sink;
        this.activities = []; // Array of activities
        this.duration = 0; // Number of time steps k needed to complete this activity from source to sink.
    }

    addActivity(edge, timeStep) {
        console.log(`Adding activity (${edge.from.id}, ${edge.to.id}) at time step ${timeStep}`); // Debug: Adding activity
>>>>>>> 21f6fdfc11e02ff9b0fd591e0accabc1aff93729

        // Ensure the activities array has enough sets to accommodate the time step
        while (this.activities.length < timeStep) {
            this.activities.push(new Set()); // Initialize missing time steps with empty Sets
        }

        // Add the activity to the specified time step's Set
<<<<<<< HEAD
        this.activities[timeStep - 1].add([edge.from, edge.to]);
=======
        this.activities[timeStep - 1].add([edge.from.id, edge.to.id]);
>>>>>>> 21f6fdfc11e02ff9b0fd591e0accabc1aff93729

        console.log(
            "Activities at time step " + timeStep + ": " + Array.from(this.activities[timeStep - 1])
        ); // Debug: Activities at time step
    }

    incrementTimestep() {
        this.duration++;
    }

    getActivities() {
        return this.activities;
    }
<<<<<<< HEAD

    clone() {
        return new ActivityProfile(
          this.source,
          this.sink,
          this.activities.slice(),
          this.duration,
        );
    }
=======
>>>>>>> 21f6fdfc11e02ff9b0fd591e0accabc1aff93729
}