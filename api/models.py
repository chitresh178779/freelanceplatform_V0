# In api/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth import get_user_model # Import this

class User(AbstractUser):
    class Role(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        FREELANCER = "FREELANCER", "Freelancer"

    # We don't need a separate first/last name, username will be the primary identifier
    # We can use the default email, password fields from AbstractUser
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=50, choices=Role.choices)


# Get the active user model dynamically
# Put this AFTER the User model definition if User is your custom model
ActiveUser = get_user_model() 

class Project(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"

    # --- CATEGORY CHOICES (Example) ---
    CATEGORY_CHOICES = [
        ('webdev', 'Web Development'),
        ('design', 'Graphic Design'),
        ('writing', 'Writing/Translation'),
        ('marketing', 'Digital Marketing'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    
    # --- NEW FIELDS ---
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='other',
        db_index=True # Add index for faster filtering
    )
    skills_required = models.TextField(
        blank=True, # Allow it to be empty
        help_text="Comma-separated list of required skills (e.g., Python,React,CSS)"
    )
    # --- END NEW FIELDS ---
    
    # Relationships - Use the dynamically fetched user model here
    client = models.ForeignKey(ActiveUser, on_delete=models.CASCADE, related_name="projects_as_client")
    freelancer = models.ForeignKey(ActiveUser, on_delete=models.SET_NULL, null=True, blank=True, related_name="projects_as_freelancer")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True) # Add index for faster sorting
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title