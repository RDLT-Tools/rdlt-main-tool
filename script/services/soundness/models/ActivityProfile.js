export class ActivityProfile {
    constructor(source, sink, activities = [], duration = 0) {
        this.source = source;
        this.sink = sink;
        this.activities = activities; // Array of activities
        this.duration = duration; // Number of time steps k needed to complete this activity from source to sink.
    }

    addActivity(edge, timeStep) {
        console.log(`Adding activity (${edge.from.name}, ${edge.to.name}) at time step ${timeStep}`); // Debug: Adding activity

        // Ensure the activities array has enough sets to accommodate the time step
        while (this.activities.length < timeStep) {
            this.activities.push(new Set()); // Initialize missing time steps with empty Sets
        }

        // Add the activity to the specified time step's Set
        this.activities[timeStep - 1].add([edge.from, edge.to]);

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

    clone() {
        return new ActivityProfile(
          this.source,
          this.sink,
          this.activities.slice(),
          this.duration,
        );
    }
}