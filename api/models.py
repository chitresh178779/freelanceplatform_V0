from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        FREELANCER = "FREELANCER", "Freelancer"

    # We don't need a separate first/last name, username will be the primary identifier
    # We can use the default email, password fields from AbstractUser
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=50, choices=Role.choices)



class Project(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"

    title = models.CharField(max_length=255)
    description = models.TextField()
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    # Relationships
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects_as_client")
    freelancer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="projects_as_freelancer")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title