const notifications = [
  {
    id: 1,
    message: "New message from John Doe",
    link: "/messages/1",
    time: "2m ago"
  },
  {
    id: 2,
    message: "Your profile has been updated",
    link: "/profile",
    time: "5m ago"
  },
  {
    id: 3,
    message: "New connection request",
    link: "/connections",
    time: "10m ago"
  },
  {
    id: 4,
    message: "Project deadline approaching",
    link: "/projects/1",
    time: "1h ago"
  },
  {
    id: 5,
    message: "System maintenance scheduled",
    link: "/settings",
    time: "2h ago"
  }
];

export default function handler(req, res) {
  // Get a random number of notifications (between 0 and 5)
  const count = Math.floor(Math.random() * 6);
  
  // Shuffle the notifications array
  const shuffled = [...notifications].sort(() => 0.5 - Math.random());
  
  // Get the first 'count' notifications
  const randomNotifications = shuffled.slice(0, count);
  
  res.status(200).json({
    notifications: randomNotifications
  });
} 