from rest_framework.serializers import ModelSerializer

from .models import CustomUser


class RegisterUserSerializer(ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("email", "user_name", "password")
        extra_kwargs = {"password": {"write_only": True}}  # noqa: RUF012

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        instance = self.Meta.model(**validated_data)

        if password is not None:
            instance.set_password(password)
        instance.save()

        return instance
